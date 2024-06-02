import { IVec2, add, getCenter, getRadian, isSame, multi, rotate } from "okageo";
import { StyleScheme } from "../models";
import { LineShape, getEdges, getLinePath, getRadianP, getRadianQ, isCurveLine } from "../shapes/line";
import { newCircleHitTest } from "./shapeHitTest";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { TAU, getCurveLerpFn, isPointCloseToCurveSpline } from "../utils/geometry";
import { applyFillStyle } from "../utils/fillStyle";
import { applyCurvePath, applyPath, renderMoveIcon, renderOutlinedCircle, renderPlusIcon } from "../utils/renderer";

const VERTEX_R = 7;
const ADD_VERTEX_ANCHOR_RATE = 1;
const MOVE_ANCHOR_RATE = 1.4;

type LineHitType =
  | "move-anchor"
  | "vertex"
  | "edge"
  | "new-vertex-anchor"
  | "arc-anchor"
  | "optimize"
  | "elbow-edge"
  | "reset-elbow-edge";
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
  const arcAnchors =
    lineShape.curveType === "auto"
      ? []
      : edges.map((edge, i) => {
          const lerpFn = getCurveLerpFn(edge, curves?.[i]);
          return lerpFn(0.5);
        });
  const addAnchors = edges.map((edge, i) => {
    const lerpFn = getCurveLerpFn(edge, curves?.[i]);
    return lerpFn(0.25);
  });

  const elbow = isElbow(lineShape);
  const availableVertexIndex = elbow ? new Set([0, vertices.length - 1]) : new Set(vertices.map((_, i) => i));

  let hitResult: LineHitResult | undefined;

  function getResetElbowEdgeAnchors(scale: number): { p: IVec2; index: number }[] {
    const ret: { p: IVec2; index: number }[] = [];
    lineShape.body?.forEach((item, i) => {
      if (!item.d) return;

      const edge = edges[i + 1];
      const r = getRadian(edge[1], edge[0]) + Math.PI / 2;
      const c = getCenter(edge[0], edge[1]);
      ret.push({
        p: add(c, multi({ x: Math.cos(r), y: Math.sin(r) }, VERTEX_R * 2 * scale)),
        index: i + 1,
      });
    });
    return ret;
  }

  function getMoveAnchor(scale: number): IVec2 {
    const v = rotate({ x: 0, y: -30 }, getRadianP(lineShape));
    return add(vertices[0], multi(v, scale));
  }

  function getAddAnchorP(scale: number): IVec2 {
    const v = rotate({ x: 20, y: 0 }, getRadianP(lineShape));
    return add(lineShape.p, multi(v, scale));
  }

  function getAddAnchorQ(scale: number): IVec2 {
    const v = rotate({ x: 20, y: 0 }, getRadianQ(lineShape));
    return add(lineShape.q, multi(v, scale));
  }

  function getOptimizeAnchorP(scale: number): IVec2 | undefined {
    if (!lineShape.pConnection) return;
    const rate = lineShape.pConnection.rate;
    if (lineShape.pConnection.id === lineShape.qConnection?.id || !isSame(rate, { x: 0.5, y: 0.5 })) return;
    const v = rotate({ x: 0, y: 20 }, getRadianP(lineShape));
    return add(lineShape.p, multi(v, scale));
  }

  function getOptimizeAnchorQ(scale: number): IVec2 | undefined {
    if (!lineShape.qConnection) return;
    const rate = lineShape.qConnection.rate;
    if (lineShape.qConnection.id === lineShape.pConnection?.id || !isSame(rate, { x: 0.5, y: 0.5 })) return;
    const v = rotate({ x: 0, y: 20 }, getRadianQ(lineShape));
    return add(lineShape.q, multi(v, scale));
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
      const optimizeAnchorP = getOptimizeAnchorP(scale);
      if (optimizeAnchorP) {
        const testFn = newCircleHitTest(optimizeAnchorP, vertexSize * ADD_VERTEX_ANCHOR_RATE);
        if (testFn.test(p)) {
          return { type: "optimize", index: 0 };
        }
      }
    }

    {
      const optimizeAnchorQ = getOptimizeAnchorQ(scale);
      if (optimizeAnchorQ) {
        const testFn = newCircleHitTest(optimizeAnchorQ, vertexSize * ADD_VERTEX_ANCHOR_RATE);
        if (testFn.test(p)) {
          return { type: "optimize", index: vertices.length - 1 };
        }
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

        {
          const testFn = newCircleHitTest(getAddAnchorP(scale), addAnchorSize);
          if (testFn.test(p)) {
            return { type: "new-vertex-anchor", index: -1 };
          }
        }

        {
          const testFn = newCircleHitTest(getAddAnchorQ(scale), addAnchorSize);
          if (testFn.test(p)) {
            return { type: "new-vertex-anchor", index: vertices.length - 1 };
          }
        }
      }

      {
        const arcAnchorSize = vertexSize;
        const arcAnchorIndex = arcAnchors.findIndex((v) => {
          const testFn = newCircleHitTest(v, arcAnchorSize);
          return testFn.test(p);
        });
        if (arcAnchorIndex !== -1) {
          return { type: "arc-anchor", index: arcAnchorIndex };
        }
      }
    } else {
      const result = getResetElbowEdgeAnchors(scale).find((a) => {
        const testFn = newCircleHitTest(a.p, vertexSize * ADD_VERTEX_ANCHOR_RATE);
        return testFn.test(p);
      });
      if (result) {
        return { type: "reset-elbow-edge", index: result.index };
      }
    }

    {
      const edgeIndex = edges.findIndex((edge, i) => {
        return isPointCloseToCurveSpline(edge, [curves?.[i]], p, vertexSize);
      });

      if (edgeIndex !== -1) {
        if (elbow) {
          // Only internal edges can be moved.
          if (0 < edgeIndex && edgeIndex < edges.length - 1) {
            return { type: "elbow-edge", index: edgeIndex };
          }
        } else {
          return { type: "edge", index: edgeIndex };
        }
      }
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
        arcAnchors.forEach((c) => {
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

        [getAddAnchorP(scale), getAddAnchorQ(scale)].forEach((c) => {
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, size, size, 0, 0, TAU);
          ctx.fill();
          renderPlusIcon(ctx, c, size * 2);
        });
      }
    } else {
      applyFillStyle(ctx, { color: style.selectionPrimary });
      const size = vertexSize * ADD_VERTEX_ANCHOR_RATE;
      getResetElbowEdgeAnchors(scale).forEach((a) => {
        ctx.beginPath();
        ctx.ellipse(a.p.x, a.p.y, size, size, 0, 0, TAU);
        ctx.fill();
      });
    }

    const moveAnchor = getMoveAnchor(scale);
    {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(moveAnchor.x, moveAnchor.y, vertexSize * MOVE_ANCHOR_RATE, vertexSize * MOVE_ANCHOR_RATE, 0, 0, TAU);
      ctx.fill();
      applyFillStyle(ctx, { color: style.selectionPrimary });
      renderMoveIcon(ctx, moveAnchor, vertexSize * MOVE_ANCHOR_RATE);
    }

    const optimizeAnchorP = getOptimizeAnchorP(scale);
    if (optimizeAnchorP) {
      renderOutlinedCircle(ctx, optimizeAnchorP, vertexSize, style.transformAnchor);
    }

    const optimizeAnchorQ = getOptimizeAnchorQ(scale);
    if (optimizeAnchorQ) {
      renderOutlinedCircle(ctx, optimizeAnchorQ, vertexSize, style.transformAnchor);
    }

    if (hitResult) {
      applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 3 * scale });
      switch (hitResult.type) {
        case "optimize": {
          const p = hitResult.index === 0 ? optimizeAnchorP : optimizeAnchorQ;
          if (p) {
            applyFillStyle(ctx, { color: style.selectionSecondaly });
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, vertexSize, vertexSize, 0, 0, TAU);
            ctx.fill();
          }
          break;
        }
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
        case "edge":
        case "elbow-edge": {
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

          let p: IVec2;
          if (hitResult.index === -1) {
            p = getAddAnchorP(scale);
          } else if (hitResult.index === vertices.length - 1) {
            p = getAddAnchorQ(scale);
          } else {
            p = addAnchors[hitResult.index];
          }

          const size = vertexSize * ADD_VERTEX_ANCHOR_RATE;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, size, size, 0, 0, TAU);
          ctx.fill();
          renderPlusIcon(ctx, p, size * 2);
          break;
        }
        case "arc-anchor": {
          applyFillStyle(ctx, { color: style.selectionSecondaly });
          const p = arcAnchors[hitResult.index];
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, vertexSize, vertexSize, 0, 0, TAU);
          ctx.fill();
          break;
        }
        case "reset-elbow-edge": {
          const p = getResetElbowEdgeAnchors(scale).find((a) => a.index === hitResult?.index)?.p;
          if (p) {
            applyFillStyle(ctx, { color: style.selectionSecondaly });
            const size = vertexSize * ADD_VERTEX_ANCHOR_RATE;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, size, size, 0, 0, TAU);
            ctx.fill();
          }
          break;
        }
      }
    }
  }

  return { saveHitResult, hitTest, render };
}
export type LineBounding = ReturnType<typeof newLineBounding>;

function isElbow(lineShape: LineShape): boolean {
  return lineShape.lineType === "elbow";
}
