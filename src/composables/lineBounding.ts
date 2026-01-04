import {
  IVec2,
  MINVALUE,
  add,
  getCenter,
  getDistance,
  getNorm,
  getOuterRectangle,
  getRadian,
  isSame,
  multi,
  rotate,
  sub,
} from "okageo";
import { BezierCurveControl, ConnectionPoint, StyleScheme } from "../models";
import {
  LineShape,
  getConnections,
  getEdges,
  getLinePath,
  getRadianP,
  getRadianQ,
  isCurveLine,
  isLineShape,
} from "../shapes/line";
import { newCircleHitTest } from "./shapeHitTest";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { ISegment, TAU, getCurveLerpFn, isOnDonutArc, isPointCloseToCurveSpline } from "../utils/geometry";
import { applyFillStyle } from "../utils/fillStyle";
import {
  applyCurvePath,
  applyPath,
  renderMoveIcon,
  renderOutlinedCircle,
  renderOutlinedDonutArc,
  renderPlusIcon,
  renderRotationArrow,
} from "../utils/renderer";
import { getSegmentVicinityFrom, getSegmentVicinityTo } from "../utils/path";
import { canAddBezierControls, getModifiableBezierControls } from "../shapes/utils/curveLine";
import { isConnectedToCenter, isSameConnection } from "../shapes/utils/line";
import { CanvasCTX } from "../utils/types";
import { THRESHOLD_FOR_SEGMENT } from "../shapes/core";
import { getShapeStatusColor } from "./states/appCanvas/utils/style";
import { ShapeComposite } from "./shapeComposite";
import { getIntersectedOutlines } from "../shapes";
import { isLineSnappableShape, renderConnectionResult } from "./lineSnapping";
import { findBackward } from "../utils/commons";

const VERTEX_R = 7;
const ADD_VERTEX_ANCHOR_RATE = 1;
const BOUNDS_ANCHOR_SIZE = VERTEX_R * 1.4;
export const BEZIER_ANCHOR_SIZE = 6;
const BEZIER_ANCHOR_VICINITY_SIZE = 14;
const BEZIER_ANCHOR_VICINITY_INNER_RATE = 0.4;
const BEZIER_DONUT_RAD = Math.PI / 3;

type LineHitType =
  | "move-anchor"
  | "rotate-anchor"
  | "vertex"
  | "segment"
  | "new-vertex-anchor"
  | "arc-anchor"
  | "optimize"
  | "elbow-edge"
  | "reset-elbow-edge"
  | "extend-and-connect";
type LineHitResultBase = {
  type: LineHitType;
  index: number;

  // For type convenience
  subIndex?: undefined;
  connection?: ConnectionPoint;
  p?: IVec2;
};
export type LineHitResult =
  | LineHitResultBase
  | {
      type: "new-bezier-anchor" | "bezier-anchor";
      index: number;
      subIndex: 0 | 1;
      connection: undefined;
    }
  | {
      type: "extend-and-connect";
      index: number;
      subIndex: undefined;
      connection: ConnectionPoint;
      p: IVec2;
    };

type BezierAnchorInfo =
  | {
      type: 0;
      p: IVec2;
      addAnchor?: boolean;
    }
  | {
      type: 1;
      p: IVec2;
      vicinity: IVec2;
      r: number;
      addAnchor?: boolean;
    };

interface Option {
  lineShape: LineShape;
  styleScheme: StyleScheme;
  shapeComposite?: ShapeComposite;
}

export function newLineBounding(option: Option) {
  const lineShape = option.lineShape;
  const vertices = getLinePath(lineShape);
  const connections = getConnections(lineShape);
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
  const vertexWrapperRect = getOuterRectangle([vertices]);

  const elbow = isElbow(lineShape);
  const availableVertexIndex = elbow ? new Set([0, vertices.length - 1]) : new Set(vertices.map((_, i) => i));

  let hitResult: LineHitResult | undefined;

  function getExtendAnchors(): { p: IVec2; index: number; connection: ConnectionPoint; line: boolean }[] {
    const sc = option.shapeComposite;
    if (!sc) return [];

    const ret: { p: IVec2; index: number; connection: ConnectionPoint; line: boolean }[] = [];
    const snappableShapes = sc.shapes.filter((s) => isLineSnappableShape(sc, s));
    const bounds = sc.getWrapperRectForShapes(snappableShapes);
    const long = getNorm({ x: bounds.width, y: bounds.height });

    if (!option.lineShape.pConnection) {
      const candidates: [IVec2, ConnectionPoint, line: boolean][] = [];
      const edgeHead = edges[0];
      const d = getDistance(edgeHead[0], edgeHead[1]);
      if (d < MINVALUE) return [];

      const from = edgeHead[0];
      const to = add(from, multi(sub(from, edgeHead[1]), long / d));
      snappableShapes.forEach((s) =>
        getIntersectedOutlines(sc.getShapeStruct, s, from, to)?.forEach((p) =>
          candidates.push([
            p,
            {
              id: s.id,
              rate: sc.getLocationRateOnShape(s, p),
            },
            isLineShape(s),
          ]),
        ),
      );
      candidates.forEach(([p, connection, line]) => ret.push({ p, index: 0, connection, line }));
    }

    if (!option.lineShape.qConnection) {
      const candidates: [IVec2, ConnectionPoint, line: boolean][] = [];
      const edgeTail = edges[edges.length - 1];
      const d = getDistance(edgeTail[0], edgeTail[1]);
      if (d < MINVALUE) return [];

      const from = edgeTail[1];
      const to = add(from, multi(sub(from, edgeTail[0]), long / d));
      snappableShapes.forEach((s) =>
        getIntersectedOutlines(sc.getShapeStruct, s, from, to)?.forEach((p) =>
          candidates.push([
            p,
            {
              id: s.id,
              rate: sc.getLocationRateOnShape(s, p),
            },
            isLineShape(s),
          ]),
        ),
      );
      candidates.forEach(([p, connection, line]) => ret.push({ p, index: edges.length, connection, line }));
    }

    return ret;
  }

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

  function getRotateAnchor(scale: number): IVec2 {
    const v = rotate({ x: 0, y: 30 }, getRadianP(lineShape));
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

  function getAddAnchorBeziers(scale: number): ([BezierAnchorInfo, BezierAnchorInfo] | undefined)[] {
    if (autoCurve || elbow) return [];

    const distance = BEZIER_ANCHOR_SIZE * scale * 1.6;
    return edges.map((edge, i) => {
      if (!canAddBezierControls(curves?.[i])) return;
      return getBezierAnchorInfo(edge, { c1: edge[0], c2: edge[1] }, distance, true);
    });
  }

  function getBezierAnchors(scale: number): ([BezierAnchorInfo, BezierAnchorInfo] | undefined)[] {
    const distance = BEZIER_ANCHOR_SIZE * scale * 1.6;
    return bezierAnchors?.map((b, i) => getBezierAnchorInfo(edges[i], b, distance)) ?? [];
  }

  function getOptimizeAnchorP(scale: number): IVec2 | undefined {
    if (!lineShape.pConnection) return;
    if (lineShape.pConnection.id === lineShape.qConnection?.id || !isConnectedToCenter(lineShape.pConnection)) return;
    const v = rotate({ x: 0, y: 20 }, getRadianP(lineShape));
    return add(lineShape.p, multi(v, scale));
  }

  function getOptimizeAnchorQ(scale: number): IVec2 | undefined {
    if (!lineShape.qConnection) return;
    if (lineShape.qConnection.id === lineShape.pConnection?.id || !isConnectedToCenter(lineShape.qConnection)) return;
    const v = rotate({ x: 0, y: 20 }, getRadianQ(lineShape));
    return add(lineShape.q, multi(v, scale));
  }

  // Returns true when something changes
  function saveHitResult(result?: LineHitResult): boolean {
    const prev = hitResult;
    hitResult = result;
    if (!result) return !!prev;
    if (!prev) return true;
    if (prev.type !== result.type) return true;
    if (prev.index !== result.index) return true;
    if (prev.subIndex !== result.subIndex) return true;
    if (!isSameConnection(prev.connection, result.connection)) return true;
    return false;
  }

  function hitTest(p: IVec2, scale = 1): LineHitResult | undefined {
    const vertexSize = VERTEX_R * scale;
    const bezierSize = BEZIER_ANCHOR_SIZE * scale;
    const bezierVicinitySize = BEZIER_ANCHOR_VICINITY_SIZE * scale;
    const boundsAnchorSize = BOUNDS_ANCHOR_SIZE * scale;

    {
      const moveAnchor = getMoveAnchor(scale);
      const testFn = newCircleHitTest(moveAnchor, boundsAnchorSize);
      if (testFn.test(p)) {
        return { type: "move-anchor", index: -1 };
      }
    }

    {
      const moveAnchor = getRotateAnchor(scale);
      const testFn = newCircleHitTest(moveAnchor, boundsAnchorSize);
      if (testFn.test(p)) {
        return { type: "rotate-anchor", index: -1 };
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
      const hitResult = hitTestBeziers(getBezierAnchors(scale), bezierSize, bezierVicinitySize, p);
      if (hitResult) return hitResult;
    }

    {
      const hitResult = hitTestBeziers(getAddAnchorBeziers(scale), bezierSize, bezierVicinitySize, p);
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
      const segmentSize = THRESHOLD_FOR_SEGMENT * scale;
      const edgeIndex = edges.findIndex((edge, i) => {
        return isPointCloseToCurveSpline(edge, [curves?.[i]], p, segmentSize);
      });

      if (edgeIndex !== -1) {
        if (elbow) {
          // Only internal straight edges can be moved.
          if (0 < edgeIndex && edgeIndex < edges.length - 1 && !curves?.[edgeIndex]) {
            return { type: "elbow-edge", index: edgeIndex };
          }
        } else {
          return { type: "segment", index: edgeIndex };
        }
      }
    }

    {
      const anchors = getExtendAnchors();
      const result = findBackward(anchors, (a) => {
        const testFn = newCircleHitTest(a.p, vertexSize);
        return testFn.test(p);
      });
      if (result)
        return { type: "extend-and-connect", index: result.index, connection: result.connection, p: result.p };
    }
  }

  function render(ctx: CanvasCTX, scale = 1) {
    const vertexSize = VERTEX_R * scale;
    const bezierSize = BEZIER_ANCHOR_SIZE * scale;
    const bezierVicinitySize = BEZIER_ANCHOR_VICINITY_SIZE * scale;
    const boundsAnchorSize = BOUNDS_ANCHOR_SIZE * scale;
    const style = option.styleScheme;

    const addAnchorBeziers = getAddAnchorBeziers(scale);
    const bezierViewAnchors = getBezierAnchors(scale);

    renderBeziers(ctx, vertices, bezierViewAnchors, bezierSize, bezierVicinitySize, scale, style);
    renderBeziers(ctx, vertices, addAnchorBeziers, bezierSize, bezierVicinitySize, scale, style);

    {
      const anchors = getExtendAnchors();
      const size = vertexSize;
      anchors.forEach((a) => {
        renderOutlinedCircle(ctx, a.p, size, style.transformAnchor);
      });

      if (hitResult?.type === "extend-and-connect") {
        const hit = anchors.find((a) => isSameConnection(hitResult?.connection, a.connection));
        if (hit) {
          renderOutlinedCircle(ctx, hit.p, size, style.selectionSecondaly);
          const p = vertices[hit.index];
          applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 3 * scale });
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(hit.p.x, hit.p.y);
          ctx.stroke();

          if (option.shapeComposite) {
            renderConnectionResult(ctx, {
              result: {
                connection: hit.connection,
                outlineSrc: hit.connection.id,
                p: hit.p,
              },
              scale,
              style,
              shapeComposite: option.shapeComposite,
            });
          }
        }
      }
    }

    if (!elbow) {
      {
        applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 3 * scale });
        const size = vertexSize * ADD_VERTEX_ANCHOR_RATE;
        arcAnchors.forEach((c) => {
          ctx.beginPath();
          ctx.arc(c.x, c.y, size, 0, TAU);
          ctx.stroke();
        });
      }

      {
        ctx.fillStyle = "#fff";
        applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 3 * scale });
        const size = vertexSize * ADD_VERTEX_ANCHOR_RATE;
        getAddAnchorBody(scale).forEach((c) => {
          ctx.beginPath();
          ctx.arc(c.x, c.y, size, 0, TAU);
          ctx.fill();
          renderPlusIcon(ctx, c, size * 2);
        });

        [getAddAnchorP(scale), getAddAnchorQ(scale)].forEach((c) => {
          ctx.beginPath();
          ctx.arc(c.x, c.y, size, 0, TAU);
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
        ctx.arc(a.p.x, a.p.y, size, 0, TAU);
        ctx.fill();
      });
    }

    applyStrokeStyle(ctx, { color: getShapeStatusColor(style, lineShape) ?? style.selectionPrimary, width: 3 * scale });
    vertices.forEach((p, i) => {
      if (!availableVertexIndex.has(i)) return;

      if (connections[i]) {
        applyFillStyle(ctx, { color: getShapeStatusColor(style, lineShape) ?? style.selectionPrimary });
      } else {
        ctx.fillStyle = "#fff";
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, vertexSize, 0, TAU);
      ctx.fill();
      ctx.stroke();

      if (connections[i]?.optimized) {
        applyFillStyle(ctx, { color: style.selectionSecondaly });
        ctx.beginPath();
        ctx.arc(p.x, p.y, vertexSize * 0.5, 0, TAU);
        ctx.fill();
      }
    });

    const moveAnchor = getMoveAnchor(scale);
    {
      applyFillStyle(ctx, { color: style.selectionPrimary });
      ctx.beginPath();
      ctx.arc(moveAnchor.x, moveAnchor.y, boundsAnchorSize, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fff";
      renderMoveIcon(ctx, moveAnchor, boundsAnchorSize);
    }

    const rotateAnchor = getRotateAnchor(scale);
    {
      applyFillStyle(ctx, { color: style.selectionPrimary });
      ctx.beginPath();
      ctx.arc(rotateAnchor.x, rotateAnchor.y, boundsAnchorSize, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fff";
      renderRotationArrow(ctx, rotateAnchor, 0, boundsAnchorSize);
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
            ctx.arc(p.x, p.y, vertexSize, 0, TAU);
            ctx.fill();
          }
          break;
        }
        case "move-anchor": {
          applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: style.selectionLineWidth * scale });
          applyFillStyle(ctx, { color: style.selectionSecondaly });
          ctx.beginPath();
          ctx.arc(moveAnchor.x, moveAnchor.y, boundsAnchorSize, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#fff";
          renderMoveIcon(ctx, moveAnchor, boundsAnchorSize);

          applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 3 * scale });
          ctx.beginPath();
          ctx.rect(vertexWrapperRect.x, vertexWrapperRect.y, vertexWrapperRect.width, vertexWrapperRect.height);
          ctx.stroke();
          break;
        }
        case "rotate-anchor": {
          applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: style.selectionLineWidth * scale });
          applyFillStyle(ctx, { color: style.selectionSecondaly });
          ctx.beginPath();
          ctx.arc(rotateAnchor.x, rotateAnchor.y, boundsAnchorSize, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#fff";
          renderRotationArrow(ctx, rotateAnchor, 0, boundsAnchorSize);

          applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 3 * scale });
          ctx.beginPath();
          ctx.rect(vertexWrapperRect.x, vertexWrapperRect.y, vertexWrapperRect.width, vertexWrapperRect.height);
          ctx.stroke();
          break;
        }
        case "vertex": {
          renderVertexAnchorHighlight(ctx, style, scale, vertices[hitResult.index]);
          break;
        }
        case "segment":
        case "elbow-edge": {
          applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 3 * scale });
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
          ctx.arc(p.x, p.y, size, 0, TAU);
          ctx.fill();
          renderPlusIcon(ctx, p, size * 2);
          break;
        }
        case "arc-anchor": {
          applyFillStyle(ctx, { color: style.selectionSecondaly });
          const p = arcAnchors[hitResult.index];
          ctx.beginPath();
          ctx.arc(p.x, p.y, vertexSize, 0, TAU);
          ctx.fill();
          break;
        }
        case "new-bezier-anchor":
        case "bezier-anchor": {
          const a = (hitResult.type === "new-bezier-anchor" ? addAnchorBeziers : bezierViewAnchors)[hitResult.index]?.[
            hitResult.subIndex
          ];
          if (a) {
            if (a.type === 1) {
              renderOutlinedDonutArc(
                ctx,
                a.vicinity,
                bezierVicinitySize,
                a.r - BEZIER_DONUT_RAD,
                a.r + BEZIER_DONUT_RAD,
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
            ctx.arc(p.x, p.y, size, 0, TAU);
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

export function renderBezierControls(ctx: CanvasCTX, style: StyleScheme, scale: number, lineShape: LineShape) {
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

function getBezierAnchorInfo(
  edge: ISegment,
  bezier: BezierCurveControl | undefined,
  distance: number,
  addAnchor = false,
): [BezierAnchorInfo, BezierAnchorInfo] | undefined {
  if (!bezier) return;

  return [bezier.c1, bezier.c2].map<BezierAnchorInfo>((c, j) => {
    if (!isSame(c, edge[j])) return { type: 0, p: c };

    const vicinity = (j === 0 ? getSegmentVicinityFrom : getSegmentVicinityTo)(edge, bezier, distance);
    // Use this vicinity only for deriving the angle because vicinity calculation isn't so accurate when the curve is steep.
    const vicinityRad = getRadian(vicinity, c);
    return {
      type: 1,
      p: c,
      vicinity: add(c, rotate({ x: distance, y: 0 }, vicinityRad)),
      r: vicinityRad,
      addAnchor,
    };
  }) as [BezierAnchorInfo, BezierAnchorInfo];
}

function hitTestBeziers(
  bezierViewAnchors: ([BezierAnchorInfo, BezierAnchorInfo] | undefined)[],
  bezierSize: number,
  bezierVicinitySize: number,
  p: IVec2,
): LineHitResult | undefined {
  let hitResult: LineHitResult | undefined;
  bezierViewAnchors.some((a, i) => {
    if (!a) return;

    return a.some((v, j) => {
      if (v.type === 1) {
        const hit = isOnDonutArc(
          v.vicinity,
          bezierVicinitySize,
          bezierVicinitySize,
          0,
          v.r - BEZIER_DONUT_RAD,
          v.r + BEZIER_DONUT_RAD,
          BEZIER_ANCHOR_VICINITY_INNER_RATE,
          p,
        );
        if (hit) {
          hitResult = { type: v.addAnchor ? "new-bezier-anchor" : "bezier-anchor", index: i, subIndex: j as 0 | 1 };
          return true;
        }
      } else {
        if (newCircleHitTest(v.p, bezierSize).test(p)) {
          hitResult = { type: v.addAnchor ? "new-bezier-anchor" : "bezier-anchor", index: i, subIndex: j as 0 | 1 };
          return true;
        }
      }
    });
  });
  return hitResult;
}

function renderBeziers(
  ctx: CanvasCTX,
  vertices: IVec2[],
  bezierViewAnchors: ([BezierAnchorInfo, BezierAnchorInfo] | undefined)[],
  bezierSize: number,
  bezierVicinitySize: number,
  scale = 1,
  style: StyleScheme,
) {
  bezierViewAnchors.forEach((anchor, i) => {
    anchor?.forEach((a, j) => {
      if (a.type === 1) {
        renderOutlinedDonutArc(
          ctx,
          a.vicinity,
          bezierVicinitySize,
          a.r - BEZIER_DONUT_RAD,
          a.r + BEZIER_DONUT_RAD,
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
}

export function renderVertexAnchorHighlight(ctx: CanvasCTX, style: StyleScheme, scale: number, p: IVec2) {
  const vertexSize = VERTEX_R * scale;
  applyFillStyle(ctx, { color: style.selectionSecondaly });
  ctx.beginPath();
  ctx.arc(p.x, p.y, vertexSize, 0, TAU);
  ctx.fill();
}

export function isSegmentRelatedHitResult(hitResult: LineHitResult): hitResult is LineHitResult & { index: number } {
  return (
    hitResult.type === "segment" ||
    hitResult.type === "arc-anchor" ||
    hitResult.type === "new-bezier-anchor" ||
    hitResult.type === "new-vertex-anchor"
  );
}
