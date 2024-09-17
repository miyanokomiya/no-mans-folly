import { IVec2, add, getCenter, getRadian, isSame, multi, rotate } from "okageo";
import { StyleScheme } from "../models";
import { LineShape, getEdges, getLinePath, getRadianP, getRadianQ, isCurveLine } from "../shapes/line";
import { newCircleHitTest } from "./shapeHitTest";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { TAU, getCurveLerpFn, isOnDonutArc, isPointCloseToCurveSpline } from "../utils/geometry";
import { applyFillStyle } from "../utils/fillStyle";
import {
  applyCurvePath,
  applyPath,
  renderMoveIcon,
  renderOutlinedCircle,
  renderOutlinedDonutArc,
  renderPlusIcon,
} from "../utils/renderer";
import { getSegmentVicinityFrom, getSegmentVicinityTo } from "../utils/path";
import { canAddBezierControls, getModifiableBezierControls } from "../shapes/utils/curveLine";

const VERTEX_R = 7;
const ADD_VERTEX_ANCHOR_RATE = 1;
const MOVE_ANCHOR_RATE = 1.4;
export const BEZIER_ANCHOR_SIZE = 6;
const BEZIER_ANCHOR_VICINITY_SIZE = 14;
const BEZIER_ANCHOR_VICINITY_INNER_RATE = 0.4;

type LineHitType =
  | "move-anchor"
  | "vertex"
  | "edge"
  | "new-vertex-anchor"
  | "arc-anchor"
  | "optimize"
  | "elbow-edge"
  | "reset-elbow-edge";
export type LineHitResult =
  | {
      type: LineHitType;
      index: number;
    }
  | {
      type: "new-bezier-anchor" | "bezier-anchor";
      index: number;
      subIndex: 0 | 1;
    };

type BezierAnchor =
  | {
      type: 0;
      p: IVec2;
    }
  | {
      type: 1;
      p: IVec2;
      vicinity: IVec2;
      r: number;
    };

interface Option {
  lineShape: LineShape;
  styleScheme: StyleScheme;
}

export function newLineBounding(option: Option) {
  const lineShape = option.lineShape;
  const vertices = getLinePath(lineShape);
  const edges = getEdges(lineShape);
  const autoCurve = lineShape.curveType === "auto";
  const curves = isCurveLine(lineShape) ? lineShape.curves : undefined;
  const arcAnchors = autoCurve
    ? []
    : edges.map((edge, i) => {
        const lerpFn = getCurveLerpFn(edge, curves?.[i]);
        return lerpFn(0.5);
      });
  const bezierAnchors = getModifiableBezierControls(lineShape);

  const elbow = isElbow(lineShape);
  const availableVertexIndex = elbow ? new Set([0, vertices.length - 1]) : new Set(vertices.map((_, i) => i));

  let hitResult: LineHitResult | undefined;

  function getResetElbowEdgeAnchors(scale: number): { p: IVec2; index: number; c: IVec2 }[] {
    const ret: { p: IVec2; index: number; c: IVec2 }[] = [];
    lineShape.body?.forEach((item, i) => {
      if (!item.elbow) return;

      const edge = edges[i + 1];
      const r = getRadian(edge[1], edge[0]) + Math.PI / 2;
      const c = getCenter(edge[0], edge[1]);
      ret.push({
        p: add(c, multi({ x: Math.cos(r), y: Math.sin(r) }, VERTEX_R * 2 * scale)),
        index: i + 1,
        c,
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

  function getAddAnchorBody(scale: number): IVec2[] {
    const margin = 36 * scale;
    return edges.map((edge, i) => getSegmentVicinityFrom(edge, curves?.[i], margin));
  }

  function getAddAnchorBeziers(scale: number): ([IVec2, IVec2] | undefined)[] {
    if (autoCurve || elbow) return [];

    const margin = 40 * scale;
    return edges.map((edge, i) => {
      if (!canAddBezierControls(curves?.[i])) return;
      return [getSegmentVicinityFrom(edge, undefined, margin), getSegmentVicinityTo(edge, undefined, margin)];
    });
  }

  function getBezierAnchors(scale: number): ([BezierAnchor, BezierAnchor] | undefined)[] {
    const distance = BEZIER_ANCHOR_SIZE * scale * 1.6;
    return (
      bezierAnchors?.map((b, i) => {
        if (!b) return;

        const edge = edges[i];
        return [b.c1, b.c2].map<BezierAnchor>((c, j) => {
          if (!isSame(c, edge[j])) return { type: 0, p: c };

          // This edge must be stright.
          const vicinity =
            j === 0
              ? getSegmentVicinityFrom(edge, undefined, distance)
              : getSegmentVicinityTo(edge, undefined, distance);
          return { type: 1, p: c, vicinity, r: getRadian(vicinity, c) };
        }) as [BezierAnchor, BezierAnchor];
      }) ?? []
    );
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
    const bezierSize = BEZIER_ANCHOR_SIZE * scale;
    const bezierVicinitySize = BEZIER_ANCHOR_VICINITY_SIZE * scale;

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
      let hitResult: LineHitResult | undefined;
      getBezierAnchors(scale).some((a, i) => {
        if (!a) return;

        return a.some((v, j) => {
          if (v.type === 1) {
            const hit = isOnDonutArc(
              v.vicinity,
              bezierVicinitySize,
              bezierVicinitySize,
              0,
              v.r - Math.PI / 2,
              v.r + Math.PI / 2,
              BEZIER_ANCHOR_VICINITY_INNER_RATE,
              p,
            );
            if (hit) {
              hitResult = { type: "bezier-anchor", index: i, subIndex: j as 0 | 1 };
              return true;
            }
          } else {
            if (newCircleHitTest(v.p, bezierSize).test(p)) {
              hitResult = { type: "bezier-anchor", index: i, subIndex: j as 0 | 1 };
              return true;
            }
          }
        });
      });
      if (hitResult) return hitResult;
    }

    {
      const addAnchorBeziers = getAddAnchorBeziers(scale);
      let hitResult: LineHitResult | undefined;
      addAnchorBeziers.some((v, i) => {
        if (!v) return;

        if (newCircleHitTest(v[0], bezierSize).test(p)) {
          hitResult = { type: "new-bezier-anchor", index: i, subIndex: 0 };
          return true;
        } else if (newCircleHitTest(v[1], bezierSize).test(p)) {
          hitResult = { type: "new-bezier-anchor", index: i, subIndex: 1 };
          return true;
        }
      });
      if (hitResult) return hitResult;
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
        const edgeCenterIndex = getAddAnchorBody(scale).findIndex((v) => {
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
          // Only internal straight edges can be moved.
          if (0 < edgeIndex && edgeIndex < edges.length - 1 && !curves?.[edgeIndex]) {
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
    const bezierSize = BEZIER_ANCHOR_SIZE * scale;
    const bezierVicinitySize = BEZIER_ANCHOR_VICINITY_SIZE * scale;
    const style = option.styleScheme;

    const points = vertices;
    const addAnchorBeziers = getAddAnchorBeziers(scale);
    const bezierViewAnchors = getBezierAnchors(scale);

    bezierViewAnchors.forEach((anchor, i) => {
      anchor?.forEach((a, j) => {
        if (a.type === 1) {
          renderOutlinedDonutArc(
            ctx,
            a.vicinity,
            bezierVicinitySize,
            a.r - Math.PI / 2,
            a.r + Math.PI / 2,
            BEZIER_ANCHOR_VICINITY_INNER_RATE,
            style.transformAnchor,
          );
        } else {
          applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 2 * scale, dash: "dot" });
          ctx.beginPath();
          applyPath(ctx, [vertices[i + j], a.p]);
          ctx.stroke();
          renderOutlinedCircle(ctx, a.p, bezierSize, style.transformAnchor);
        }
      });
    });

    ctx.fillStyle = "#fff";
    applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 3 * scale });
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
        addAnchorBeziers.forEach((c) => {
          if (!c) return;
          renderOutlinedCircle(ctx, c[0], bezierSize, style.transformAnchor);
          renderOutlinedCircle(ctx, c[1], bezierSize, style.transformAnchor);
        });
      }

      {
        ctx.fillStyle = "#fff";
        applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 3 * scale });
        const size = vertexSize * ADD_VERTEX_ANCHOR_RATE;
        getAddAnchorBody(scale).forEach((c) => {
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
      applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 2 * scale });
      applyFillStyle(ctx, { color: style.selectionPrimary });
      const size = vertexSize * ADD_VERTEX_ANCHOR_RATE;
      getResetElbowEdgeAnchors(scale).forEach((a) => {
        ctx.beginPath();
        ctx.moveTo(a.p.x, a.p.y);
        ctx.lineTo(a.c.x, a.c.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(a.p.x, a.p.y, size, size, 0, 0, TAU);
        ctx.fill();
      });
    }

    const moveAnchor = getMoveAnchor(scale);
    {
      applyFillStyle(ctx, { color: style.selectionPrimary });
      ctx.beginPath();
      ctx.ellipse(moveAnchor.x, moveAnchor.y, vertexSize * MOVE_ANCHOR_RATE, vertexSize * MOVE_ANCHOR_RATE, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fff";
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
          applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: style.selectionLineWidth * scale });
          applyFillStyle(ctx, { color: style.selectionSecondaly });
          ctx.beginPath();
          ctx.arc(moveAnchor.x, moveAnchor.y, vertexSize * MOVE_ANCHOR_RATE, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#fff";
          renderMoveIcon(ctx, moveAnchor, vertexSize * MOVE_ANCHOR_RATE);

          applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 3 * scale });
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
          applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 3 * scale });
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
            p = getAddAnchorBody(scale)[hitResult.index];
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
        case "new-bezier-anchor": {
          const p = addAnchorBeziers[hitResult.index]?.[hitResult.subIndex];
          if (p) {
            renderOutlinedCircle(ctx, p, bezierSize, style.selectionSecondaly);
          }
          break;
        }
        case "bezier-anchor": {
          const a = bezierViewAnchors[hitResult.index]?.[hitResult.subIndex === 1 ? 1 : 0];
          if (a) {
            if (a.type === 1) {
              renderOutlinedDonutArc(
                ctx,
                a.vicinity,
                bezierVicinitySize,
                a.r - Math.PI / 2,
                a.r + Math.PI / 2,
                BEZIER_ANCHOR_VICINITY_INNER_RATE,
                style.selectionSecondaly,
              );
            } else {
              renderOutlinedCircle(ctx, a.p, bezierSize, style.selectionSecondaly);
            }
          }
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

export function renderBezierControls(
  ctx: CanvasRenderingContext2D,
  style: StyleScheme,
  scale: number,
  lineShape: LineShape,
) {
  const edges = getEdges(lineShape);
  const bezierAnchors = getModifiableBezierControls(lineShape);
  const bezierSize = BEZIER_ANCHOR_SIZE * scale;
  applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 2 * scale, dash: "dot" });
  bezierAnchors?.forEach((b, i) => {
    if (!b) return;

    const edge = edges[i];
    ctx.beginPath();
    applyPath(ctx, [edge[0], b.c1]);
    applyPath(ctx, [edge[1], b.c2]);
    ctx.stroke();

    if (!isSame(edge[0], b.c1)) {
      renderOutlinedCircle(ctx, b.c1, bezierSize, style.transformAnchor);
    }
    if (!isSame(edge[1], b.c2)) {
      renderOutlinedCircle(ctx, b.c2, bezierSize, style.transformAnchor);
    }
  });
}
