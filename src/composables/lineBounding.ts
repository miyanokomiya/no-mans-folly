import { IVec2, add, multi, rotate } from "okageo";
import { StyleScheme } from "../models";
import { LineShape, getEdges, getLinePath, getRadianP, isCurveLine } from "../shapes/line";
import { newCircleHitTest } from "./shapeHitTest";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { TAU, getCurveLerpFn, isPointCloseToCurveSpline } from "../utils/geometry";
import { applyFillStyle } from "../utils/fillStyle";
import { applyCurvePath, applyPath, renderMoveIcon, renderPlusIcon } from "../utils/renderer";

const VERTEX_R = 7;
const ADD_VERTEX_ANCHOR_RATE = 1;
const MOVE_ANCHOR_RATE = 1.4;

type LineHitType = "move-anchor" | "vertex" | "edge" | "new-vertex-anchor" | "arc-anchor";
export interface LineHitResult {
  type: LineHitType;
  index: number;
}

interface Option {
  lineShape: LineShape;
  styleScheme: StyleScheme;
}

export function newLineBounding(option: Option) {
  const lineShape = option.lineShape;
  const vertices = getLinePath(lineShape);
  const edges = getEdges(lineShape);
  const curves = isCurveLine(lineShape) ? lineShape.curves : undefined;
  const edgeCenters = edges.map((edge, i) => {
    const lerpFn = getCurveLerpFn(edge, curves?.[i]);
    return lerpFn(0.5);
  });
  const addAnchors = edges.map((edge, i) => {
    const lerpFn = getCurveLerpFn(edge, curves?.[i]);
    return lerpFn(0.25);
  });
  const moveAnchorV = rotate({ x: 30, y: 0 }, getRadianP(lineShape));

  const elbow = isElbow(lineShape);
  const availableVertexIndex = elbow ? new Set([0, vertices.length - 1]) : new Set(vertices.map((_, i) => i));

  let hitResult: LineHitResult | undefined;

  function getMoveAnchor(scale: number): IVec2 {
    return add(vertices[0], multi(moveAnchorV, scale));
  }

  // Returns true when something changes
  function saveHitResult(result?: LineHitResult): boolean {
    const prev = hitResult;
    hitResult = result;
    if (!result) return !!prev;
    if (!prev) return true;
    if (prev.index !== result.index) return true;
    if (prev.type !== result.type) return true;
    return false;
  }

  function hitTest(p: IVec2, scale = 1): LineHitResult | undefined {
    const vertexSize = VERTEX_R * scale;

    {
      const moveAnchor = getMoveAnchor(scale);
      const testFn = newCircleHitTest(moveAnchor, vertexSize * MOVE_ANCHOR_RATE);
      if (testFn.test(p)) {
        return { type: "move-anchor", index: 0 };
      }
    }

    {
      const vertexIndex = vertices.findIndex((v) => {
        const testFn = newCircleHitTest(v, vertexSize);
        return testFn.test(p);
      });
      if (availableVertexIndex.has(vertexIndex)) {
        return { type: "vertex", index: vertexIndex };
      }
    }

    if (!elbow) {
      {
        const addAnchorSize = vertexSize * ADD_VERTEX_ANCHOR_RATE;
        const edgeCenterIndex = addAnchors.findIndex((v) => {
          const testFn = newCircleHitTest(v, addAnchorSize);
          return testFn.test(p);
        });
        if (edgeCenterIndex !== -1) {
          return { type: "new-vertex-anchor", index: edgeCenterIndex };
        }
      }

      {
        const arcAnchorSize = vertexSize;
        const arcAnchorIndex = edgeCenters.findIndex((v) => {
          const testFn = newCircleHitTest(v, arcAnchorSize);
          return testFn.test(p);
        });
        if (arcAnchorIndex !== -1) {
          return { type: "arc-anchor", index: arcAnchorIndex };
        }
      }
    }

    {
      const edgeIndex = edges.findIndex((edge, i) => {
        return isPointCloseToCurveSpline(edge, [curves?.[i]], p, vertexSize);
      });

      if (edgeIndex !== -1) {
        // Each edge of elbow line shouldn't be targeted.
        // => They are calculated automatically.
        return { type: elbow ? "move-anchor" : "edge", index: edgeIndex };
      }
    }
  }

  function getCursorStyle(hitBounding: LineHitResult): string | undefined {
    if (!hitBounding) return;

    switch (hitBounding.type) {
      case "vertex":
        return "grab";
      case "edge":
        return "move";
      default:
        return;
    }
  }

  function render(ctx: CanvasRenderingContext2D, scale = 1) {
    const vertexSize = VERTEX_R * scale;
    const style = option.styleScheme;
    applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 3 * scale });
    ctx.fillStyle = "#fff";

    const points = vertices;
    points.forEach((p, i) => {
      if (!availableVertexIndex.has(i)) return;

      ctx.beginPath();
      ctx.ellipse(p.x, p.y, vertexSize, vertexSize, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    });

    if (!elbow) {
      {
        applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 3 * scale });
        const size = vertexSize * ADD_VERTEX_ANCHOR_RATE;
        edgeCenters.forEach((c) => {
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, size, size, 0, 0, TAU);
          ctx.stroke();
        });
      }

      {
        applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 3 * scale });
        const size = vertexSize * ADD_VERTEX_ANCHOR_RATE;
        addAnchors.forEach((c) => {
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, size, size, 0, 0, TAU);
          ctx.fill();
          renderPlusIcon(ctx, c, size * 2);
        });
      }
    }

    const moveAnchor = getMoveAnchor(scale);
    ctx.beginPath();
    ctx.ellipse(moveAnchor.x, moveAnchor.y, vertexSize * MOVE_ANCHOR_RATE, vertexSize * MOVE_ANCHOR_RATE, 0, 0, TAU);
    ctx.fill();
    applyFillStyle(ctx, { color: style.selectionPrimary });
    renderMoveIcon(ctx, moveAnchor, vertexSize * MOVE_ANCHOR_RATE);

    if (hitResult) {
      applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 3 * scale });
      switch (hitResult.type) {
        case "move-anchor": {
          applyFillStyle(ctx, { color: style.selectionPrimary });
          ctx.beginPath();
          ctx.ellipse(
            moveAnchor.x,
            moveAnchor.y,
            vertexSize * MOVE_ANCHOR_RATE,
            vertexSize * MOVE_ANCHOR_RATE,
            0,
            0,
            TAU,
          );
          ctx.fill();
          ctx.fillStyle = "#fff";
          renderMoveIcon(ctx, moveAnchor, vertexSize * MOVE_ANCHOR_RATE);

          edges.forEach((edge, i) => {
            ctx.beginPath();
            if (curves) {
              applyCurvePath(ctx, edge, [curves[i]]);
            } else {
              applyPath(ctx, edge);
            }
            ctx.stroke();
          });

          points.forEach((p, i) => {
            if (!availableVertexIndex.has(i)) return;

            ctx.beginPath();
            ctx.ellipse(p.x, p.y, vertexSize, vertexSize, 0, 0, TAU);
            ctx.fill();
            ctx.stroke();
          });
          break;
        }
        case "vertex": {
          applyFillStyle(ctx, { color: style.selectionPrimary });
          const p = points[hitResult.index];
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, vertexSize, vertexSize, 0, 0, TAU);
          ctx.fill();
          break;
        }
        case "edge": {
          ctx.beginPath();
          if (curves) {
            applyCurvePath(ctx, edges[hitResult.index], [curves[hitResult.index]]);
          } else {
            applyPath(ctx, edges[hitResult.index]);
          }
          ctx.stroke();
          break;
        }
        case "new-vertex-anchor": {
          applyFillStyle(ctx, { color: style.selectionSecondaly });
          const p = addAnchors[hitResult.index];
          const size = vertexSize * ADD_VERTEX_ANCHOR_RATE;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, size, size, 0, 0, TAU);
          ctx.fill();
          renderPlusIcon(ctx, p, size * 2);
          break;
        }
        case "arc-anchor": {
          applyFillStyle(ctx, { color: style.selectionSecondaly });
          const p = edgeCenters[hitResult.index];
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, vertexSize, vertexSize, 0, 0, TAU);
          ctx.fill();
          break;
        }
      }
    }
  }

  return { saveHitResult, hitTest, getCursorStyle, render };
}
export type LineBounding = ReturnType<typeof newLineBounding>;

function isElbow(lineShape: LineShape): boolean {
  return lineShape.lineType === "elbow";
}
