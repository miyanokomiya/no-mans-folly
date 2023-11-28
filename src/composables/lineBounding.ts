import { IVec2, add, getBezier3LerpFn, getCenter, multi, rotate } from "okageo";
import { StyleScheme } from "../models";
import { LineShape, getEdges, getLinePath, getRadianP } from "../shapes/line";
import { newCircleHitTest } from "./shapeHitTest";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { TAU, isPointCloseToBezierSegment, isPointCloseToSegment } from "../utils/geometry";
import { applyFillStyle } from "../utils/fillStyle";
import { applyBezierPath, applyPath, renderMoveIcon } from "../utils/renderer";

const VERTEX_R = 7;
const ADD_VERTEX_ANCHOR_RATE = 0.8;
const MOVE_ANCHOR_RATE = 1.4;

type LineHitType = "move-anchor" | "vertex" | "edge" | "new-vertex-anchor";
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
  const curves = lineShape.curves && lineShape.curves.length === edges.length ? lineShape.curves : undefined;
  const edgeCenters = edges.map((edge, i) => {
    if (curves) {
      const lerpFn = getBezier3LerpFn([edge[0], curves[i].c1, curves[i].c2, edge[1]]);
      return lerpFn(0.5);
    } else {
      return getCenter(edge[0], edge[1]);
    }
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
    const addAnchorSize = vertexSize * ADD_VERTEX_ANCHOR_RATE;

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
      const edgeCenterIndex = edgeCenters.findIndex((v) => {
        const testFn = newCircleHitTest(v, addAnchorSize);
        return testFn.test(p);
      });
      if (edgeCenterIndex !== -1) {
        return { type: "new-vertex-anchor", index: edgeCenterIndex };
      }
    }

    {
      let edgeIndex = -1;
      if (curves) {
        edgeIndex = edges.findIndex(([p1, p2], i) => {
          const control = curves[i];
          return isPointCloseToBezierSegment(p1, p2, control.c1, control.c2, p, vertexSize);
        });
      } else {
        edgeIndex = edges.findIndex((seg) => {
          return isPointCloseToSegment(seg, p, vertexSize);
        });
      }
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
      applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 3 * scale });
      edgeCenters.forEach((c) => {
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, vertexSize * ADD_VERTEX_ANCHOR_RATE, vertexSize * ADD_VERTEX_ANCHOR_RATE, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
      });
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
              applyBezierPath(ctx, edge, [curves[i]]);
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
            applyBezierPath(ctx, edges[hitResult.index], [curves[hitResult.index]]);
          } else {
            applyPath(ctx, edges[hitResult.index]);
          }
          ctx.stroke();
          break;
        }
        case "new-vertex-anchor": {
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
