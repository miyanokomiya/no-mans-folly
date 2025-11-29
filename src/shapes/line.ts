import {
  AffineMatrix,
  IRectangle,
  IVec2,
  add,
  applyAffine,
  getOuterRectangle,
  getRadian,
  getRectCenter,
  isOnPolygon,
  isSame,
  multiAffines,
  pathSegmentRawsToString,
  sub,
} from "okageo";
import { ConnectionPoint, CurveControl, FillStyle, LineHead, Shape, StrokeStyle } from "../models";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../utils/fillStyle";
import {
  ISegment,
  expandRect,
  getCurveSplineBounds,
  getRectPoints,
  getRelativePointOnCurvePath,
  getWrapperRect,
  isPointCloseToCurveSpline,
  getRotatedAtAffine,
  getPointLerpSlope,
  sortPointFrom,
} from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle, getStrokeWidth, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import {
  ShapeContext,
  ShapeStruct,
  THRESHOLD_FOR_SEGMENT,
  createBaseShape,
  getCommonStyle,
  updateCommonStyle,
} from "./core";
import {
  clipLineHead,
  createLineHeadSVGClipPathCommand,
  createLineHeadSVGElementInfo,
  getLineHeadRotationOriginDistance,
  getLineHeadWrapperSrcPath,
  renderLineHead,
} from "./lineHeads";
import { applyCurvePath, applyPath, createSVGCurvePath } from "../utils/renderer";
import { isTextShape } from "./text";
import { struct as textStruct } from "./text";
import {
  convertLinePathToSimplePath,
  getClosestPointOnPolyline,
  getIntersectionsBetweenSegAndPolyline,
  getPolylineEdgeInfo,
  getSegmentVicinityFrom,
  getSegmentVicinityTo,
  isBezieirControl,
} from "../utils/path";
import { SVGElementInfo } from "../utils/svgElements";
import { CanvasCTX } from "../utils/types";

export type LineType = undefined | "stright" | "elbow"; // undefined means "stright"
export type CurveType = undefined | "auto";
export type LineBodyItem = {
  p: IVec2;
  c?: ConnectionPoint;
  /**
   * Extra distance info for elbow edge.
   * "p" of "LineBodyItem" should be derived with taking care of this value.
   * => This value is intended to preserve the extra disntance info.
   * d: Distance away from "p"
   * p: Original first vertex of the edge without courner radius
   */
  elbow?: { d: number; p: IVec2 };
};

export interface LineShape extends Shape {
  fill: FillStyle;
  stroke: StrokeStyle;
  q: IVec2;
  pConnection?: ConnectionPoint;
  qConnection?: ConnectionPoint;
  pHead?: LineHead;
  qHead?: LineHead;
  body?: LineBodyItem[];
  lineType?: LineType;
  /**
   * The first item represents body[0], the last one does "q" and others do "body".
   * "curves.length" should be equal to "body.length + 1"
   */
  curves?: (CurveControl | undefined)[];
  curveType?: CurveType;
  /**
   * When true, this line jumps over former lines.
   */
  jump?: boolean;
  /**
   * When true, this line runs the shortest path between hooked shapes.
   */
  optimalHook?: boolean;
}

export const LINE_JUMP_BASE_INTERVAL = 12;

export const struct: ShapeStruct<LineShape> = {
  label: "Line",
  create(arg = {}) {
    const obj: LineShape = {
      ...createBaseShape(arg),
      type: "line",
      rotation: 0, // should always be "0" or just ignored
      fill: arg.fill ?? createFillStyle({ disabled: true }),
      stroke: arg.stroke ?? createStrokeStyle({ width: 2, lineCap: "round" }), // set rounded cap by default since it works nicely with other lines
      q: arg.q ?? { x: 100, y: 0 },
      pHead: arg.pHead,
      qHead: arg.qHead,
      body: arg.body,
      lineType: arg.lineType,
      curves: arg.curves,
      curveType: arg.curveType,
      jump: arg.jump,
    };
    if (arg.pConnection) obj.pConnection = arg.pConnection;
    if (arg.qConnection) obj.qConnection = arg.qConnection;
    return obj;
  },
  render(ctx, shape, shapeContext) {
    applyStrokeStyle(ctx, { ...shape.stroke, dash: undefined });
    applyFillStyle(ctx, shape.fill);
    const treeNode = shapeContext?.treeNodeMap[shape.id];
    const hasLabels = treeNode && treeNode.children.length > 0;
    const { pAffine, qAffine } = getHeadAffines(shape);

    let region: Path2D | undefined;

    if (pAffine || qAffine || hasLabels) {
      const outline = struct.getWrapperRect(shape, shapeContext, true);
      region = new Path2D();
      region.rect(outline.x, outline.y, outline.width, outline.height);
    }

    if (region && pAffine) {
      clipLineHead(region, shape.pHead!, pAffine, ctx.lineWidth);
    }

    if (region && qAffine) {
      clipLineHead(region, shape.qHead!, qAffine, ctx.lineWidth);
    }

    if (region && hasLabels) {
      treeNode.children.forEach((n) => {
        const label = shapeContext.shapeMap[n.id];
        if (label && isTextShape(label)) {
          applyPath(region!, textStruct.getLocalRectPolygon(label, shapeContext), true);
        }
      });
    }

    if (region) {
      ctx.save();
      ctx.clip(region, "evenodd");
    }

    ctx.beginPath();
    const curvePath = combineJumps(shape, shapeContext?.lineJumpMap.get(shape.id));
    applyCurvePath(ctx, curvePath.path, curvePath.curves);

    renderLineStroke(ctx, shape);

    if (region) {
      ctx.restore();
    }

    if (pAffine) {
      renderLineHead(ctx, shape.pHead!, pAffine, ctx.lineWidth);
    }

    if (qAffine) {
      renderLineHead(ctx, shape.qHead!, qAffine, ctx.lineWidth);
    }
  },
  createSVGElementInfo(shape, shapeContext) {
    const treeNode = shapeContext?.treeNodeMap[shape.id];
    const curvePath = combineJumps(shape, shapeContext?.lineJumpMap.get(shape.id));
    const pathStr = pathSegmentRawsToString(createSVGCurvePath(curvePath.path, curvePath.curves));
    const hasLabels = treeNode && treeNode.children.length > 0;
    const { pAffine, qAffine } = getHeadAffines(shape);
    const defaultWidth = getStrokeWidth({ ...shape.stroke, disabled: false });
    const outline = struct.getWrapperRect(shape, shapeContext, true);

    const clipId = `clip-${shape.id}`;
    const clipPathCommandList: string[] = [];

    if (pAffine) {
      const command = createLineHeadSVGClipPathCommand(shape.pHead!, pAffine, defaultWidth);
      if (command) clipPathCommandList.push(command);
    }

    if (qAffine) {
      const command = createLineHeadSVGClipPathCommand(shape.qHead!, qAffine, defaultWidth);
      if (command) clipPathCommandList.push(command);
    }

    if (hasLabels) {
      treeNode.children.forEach((n) => {
        const label = shapeContext.shapeMap[n.id];
        if (label && isTextShape(label)) {
          clipPathCommandList.push(
            pathSegmentRawsToString(createSVGCurvePath(textStruct.getLocalRectPolygon(label, shapeContext), [], true)),
          );
        }
      });
    }

    const heads: SVGElementInfo[] = [];
    const pHeadInfo =
      shape.pHead && pAffine ? createLineHeadSVGElementInfo(shape.pHead, pAffine, defaultWidth) : undefined;
    const qHeadInfo =
      shape.qHead && qAffine ? createLineHeadSVGElementInfo(shape.qHead, qAffine, defaultWidth) : undefined;
    if (pHeadInfo) heads.push(pHeadInfo);
    if (qHeadInfo) heads.push(qHeadInfo);

    return {
      tag: "g",
      children: [
        ...(clipPathCommandList.length > 0
          ? [
              {
                tag: "clipPath",
                attributes: { id: clipId, "stroke-width": defaultWidth },
                children: [
                  {
                    tag: "path",
                    attributes: {
                      "clip-rule": "evenodd",
                      d:
                        pathSegmentRawsToString(createSVGCurvePath(getRectPoints(outline))) +
                        " " +
                        clipPathCommandList.join(" "),
                    },
                  },
                ],
              },
            ]
          : []),
        {
          tag: "g",
          attributes: { fill: "none", "clip-path": clipPathCommandList.length > 0 ? `url(#${clipId})` : undefined },
          children: createLineStrokeSVGElementInfo(shape, pathStr),
        },
        ...(heads.length > 0
          ? [
              {
                tag: "g",
                attributes: {
                  ...renderFillSVGAttributes({ ...shape.stroke, disabled: false }),
                  ...renderStrokeSVGAttributes({ ...shape.stroke, dash: undefined, disabled: false }),
                },
                children: heads,
              },
            ]
          : []),
      ],
    };
  },
  getWrapperRect(shape, shapeContext, includeBounds) {
    const rects = [getOuterRectangle([getLineLocalRectPolygon(shape, shapeContext, includeBounds)])];

    if (includeBounds) {
      // Include child labels as part of bounds
      shapeContext?.treeNodeMap[shape.id]?.children?.forEach((n) => {
        const label = shapeContext.shapeMap[n.id];
        if (label) {
          const rect = shapeContext.getStruct(label.type).getWrapperRect(label, shapeContext, true);
          rects.push(rect);
        }
      });
    }

    return rects.length > 1 ? getWrapperRect(rects) : rects[0];
  },
  getLocalRectPolygon(shape, shapeContext) {
    return getLineLocalRectPolygon(shape, shapeContext);
  },
  isPointOn(shape, p, shapeContext, scale = 1) {
    const affines = getHeadAffines(shape);
    if (shape.pHead && affines.pAffine) {
      const srcPath = getLineHeadWrapperSrcPath(shape.pHead, shape.stroke.width ?? 1);
      const polygon = srcPath.map((p) => applyAffine(affines.pAffine!, p));
      if (isOnPolygon(p, polygon)) return true;
    }
    if (shape.qHead && affines.qAffine) {
      const srcPath = getLineHeadWrapperSrcPath(shape.qHead, shape.stroke.width ?? 1);
      const polygon = srcPath.map((p) => applyAffine(affines.qAffine!, p));
      if (isOnPolygon(p, polygon)) return true;
    }

    const curvePath = combineJumps(shape, shapeContext?.lineJumpMap.get(shape.id));
    if (isPointCloseToCurveSpline(curvePath.path, curvePath.curves, p, THRESHOLD_FOR_SEGMENT * scale)) return true;
    if (!shapeContext) return false;

    const treeNode = shapeContext.treeNodeMap[shape.id];
    return treeNode.children.some((c) => {
      const s = shapeContext.shapeMap[c.id];
      return shapeContext.getStruct(s.type).isPointOn(s, p, shapeContext, scale);
    });
  },
  resize(shape, resizingAffine) {
    const [p, q] = [shape.p, shape.q].map((p) => applyAffine(resizingAffine, p));
    const body = shape.body?.map((b) => ({ ...b, p: applyAffine(resizingAffine, b.p) }));
    const curves = shape.curves?.map((c) => {
      return c && "c1" in c
        ? {
            c1: applyAffine(resizingAffine, c.c1),
            c2: applyAffine(resizingAffine, c.c2),
          }
        : c;
    });

    const ret: Partial<LineShape> = {};
    if (!isSame(p, shape.p)) ret.p = p;
    if (!isSame(q, shape.q)) ret.q = q;
    if (body?.some((b, i) => !isSame(b.p, shape.body![i].p))) ret.body = body;
    if (!isSameCurve(shape.curves, curves)) ret.curves = curves;

    return ret;
  },
  getCommonStyle,
  updateCommonStyle,
  immigrateShapeIds(shape, oldToNewIdMap, removeNotFound) {
    const ret: Partial<LineShape> = {};

    if (shape.pConnection) {
      if (oldToNewIdMap[shape.pConnection.id]) {
        ret.pConnection = { ...shape.pConnection, id: oldToNewIdMap[shape.pConnection.id] };
      } else if (removeNotFound) {
        ret.pConnection = undefined;
      }
    }

    if (shape.qConnection) {
      if (oldToNewIdMap[shape.qConnection.id]) {
        ret.qConnection = { ...shape.qConnection, id: oldToNewIdMap[shape.qConnection.id] };
      } else if (removeNotFound) {
        ret.qConnection = undefined;
      }
    }

    let bodyChanged = false;
    const body = shape.body?.map((b) => {
      if (b.c?.id) {
        bodyChanged = true;
        if (oldToNewIdMap[b.c.id]) {
          return { p: b.p, c: { ...b.c, id: oldToNewIdMap[b.c.id] } };
        } else {
          return { p: b.p };
        }
      }
      return b;
    });
    if (bodyChanged) {
      ret.body = body;
    }

    return ret;
  },
  refreshRelation(shape, availableIdSet) {
    const ret: Partial<LineShape> = {};

    if (shape.pConnection && !availableIdSet.has(shape.pConnection.id)) {
      ret.pConnection = undefined;
    }

    if (shape.qConnection && !availableIdSet.has(shape.qConnection.id)) {
      ret.qConnection = undefined;
    }

    let bodyChanged = false;
    const body = shape.body?.map((b) => {
      if (b.c?.id && !availableIdSet.has(b.c.id)) {
        bodyChanged = true;
        return { p: b.p };
      }
      return b;
    });
    if (bodyChanged) {
      ret.body = body;
    }

    return Object.keys(ret).length > 0 ? ret : undefined;
  },
  getSnappingLines(shape) {
    const path = getLinePath(shape);
    const v = 0.5;
    return {
      h: path
        .toSorted((a, b) => a.y - b.y)
        .map((p) => [
          { x: p.x - v, y: p.y },
          { x: p.x + v, y: p.y },
        ]),
      v: path
        .toSorted((a, b) => a.x - b.x)
        .map((p) => [
          { x: p.x, y: p.y - v },
          { x: p.x, y: p.y + v },
        ]),
    };
  },
  getClosestOutline(shape, p, threshold) {
    const edges = getEdges(shape);
    const edgeInfo = getPolylineEdgeInfo(edges, shape.curves);

    const closestInfo = getClosestPointOnPolyline(edgeInfo, p, threshold);
    return closestInfo?.[0];
  },
  getTangentAt(shape, p) {
    const edges = getEdges(shape);
    const edgeInfo = getPolylineEdgeInfo(edges, shape.curves);

    const closestInfo = getClosestPointOnPolyline(edgeInfo, p, Infinity);
    if (!closestInfo) return shape.rotation;
    return getPointLerpSlope(edgeInfo.lerpFn, closestInfo[1]) + shape.rotation;
  },
  getIntersectedOutlines(shape, from, to) {
    const seg: ISegment = [from, to];
    const intersections = getIntersectionsBetweenSegAndPolyline(seg, getEdges(shape), shape.curves);
    return intersections.length > 0 ? sortPointFrom(from, intersections) : undefined;
  },
  getOutlinePaths(shape) {
    const path = convertLinePathToSimplePath(getLinePath(shape), shape.curves);
    return [{ path: path.path, curves: path.curves ?? [] }];
  },
  transparentSelection: true,
};

export function getLinePath(shape: LineShape): IVec2[] {
  return [shape.p, ...(shape.body?.map((b) => b.p) ?? []), shape.q];
}

export function getEdges(shape: LineShape): ISegment[] {
  const path = getLinePath(shape);
  const ret: ISegment[] = [];
  path.map((v, i) => {
    if (i === path.length - 1) return;
    ret.push([v, path[i + 1]]);
  });
  return ret;
}

// When "c" is "undefined", the connection will be deleted.
export function patchVertex(
  shape: LineShape,
  index: number,
  p: IVec2,
  c: ConnectionPoint | undefined,
): Partial<LineShape> {
  const vertices = getLinePath(shape);
  const ret: Partial<LineShape> = {};

  const curves = shiftCurves(vertices, shape.curves, [[index, p]]);
  if (curves) {
    ret.curves = curves;
  }

  switch (index) {
    case 0:
      if (shape.p !== p) ret.p = p;
      if (shape.pConnection !== c) ret.pConnection = c;
      break;
    case vertices.length - 1:
      if (shape.q !== p) ret.q = p;
      if (shape.qConnection !== c) ret.qConnection = c;
      break;
    default:
      ret.body = shape.body?.map((b, i) => (i + 1 === index ? { ...b, p, c } : b));
      break;
  }

  return ret;
}

export function detachVertex(shape: LineShape, index: number): Partial<LineShape> {
  const vertices = getLinePath(shape);
  return patchVertex(shape, index, vertices[index], undefined);
}

function shiftCurves(
  vertices: IVec2[],
  curves: LineShape["curves"],
  data: [index: number, p: IVec2, ..._: any][],
): LineShape["curves"] {
  const ret: LineShape["curves"] = curves?.concat() ?? [];

  data.forEach(([index, p]) => {
    const curveForward = ret?.[index];
    if (isBezieirControl(curveForward)) {
      const v = sub(p, vertices[index]);
      ret[index] = { c1: add(curveForward.c1, v), c2: curveForward.c2 };
    }

    const curveBackward = index > 0 ? ret?.[index - 1] : undefined;
    if (isBezieirControl(curveBackward)) {
      const v = sub(p, vertices[index]);
      ret[index - 1] = { c1: curveBackward.c1, c2: add(curveBackward.c2, v) };
    }
  });

  return ret.length > 0 ? ret : undefined;
}

function shiftCurveAtVertex(curves: LineShape["curves"], index: number, v: IVec2): LineShape["curves"] {
  const ret: LineShape["curves"] = curves?.concat() ?? [];

  const curveForward = ret?.[index];
  if (isBezieirControl(curveForward)) {
    ret[index] = { c1: add(curveForward.c1, v), c2: curveForward.c2 };
  }

  const curveBackward = index > 0 ? ret?.[index - 1] : undefined;
  if (isBezieirControl(curveBackward)) {
    ret[index - 1] = { c1: curveBackward.c1, c2: add(curveBackward.c2, v) };
  }

  return ret;
}

export function patchVertices(
  shape: LineShape,
  data: [index: number, p: IVec2, c: ConnectionPoint | undefined][],
): Partial<LineShape> {
  const vertices = getLinePath(shape);
  const ret: Partial<LineShape> = {};
  const curves = shiftCurves(vertices, shape.curves, data);
  if (curves) {
    ret.curves = curves;
  }

  return data.reduce<Partial<LineShape>>((patch, [index, p, c]) => {
    switch (index) {
      case 0:
        if (shape.p !== p) patch.p = p;
        if (shape.pConnection !== c) patch.pConnection = c;
        break;
      case vertices.length - 1:
        if (shape.q !== p) patch.q = p;
        if (shape.qConnection !== c) patch.qConnection = c;
        break;
      default:
        if (shape.body && !isSameBodyItem(shape.body[index - 1], { p, c })) {
          patch.body ??= shape.body.concat();
          patch.body[index - 1] = { p, c };
        }
        break;
    }
    return patch;
  }, ret);
}

// Reference evaluation
function isSameBodyItem(a: LineBodyItem, b: LineBodyItem): boolean {
  return a.p === b.p && a.c === b.c && a.elbow === b.elbow;
}

export function patchBodyVertex(shape: LineShape, bodyIndex: number, item: LineBodyItem): Partial<LineShape> {
  return shape.body ? { body: shape.body.map((b, i) => (i === bodyIndex ? item : b)) } : {};
}

export function patchConnection(shape: LineShape, index: number, connection?: ConnectionPoint): Partial<LineShape> {
  const vertices = getLinePath(shape);
  switch (index) {
    case 0: {
      if (!shape.pConnection && !connection) return {};
      if (shape.pConnection && !connection) return { pConnection: undefined };
      return { pConnection: connection };
    }
    case vertices.length - 1: {
      if (!shape.qConnection && !connection) return {};
      if (shape.qConnection && !connection) return { qConnection: undefined };
      return { qConnection: connection };
    }
    default: {
      if (!shape.body) {
        return {};
      } else {
        const next = shape.body.concat();
        if (!next[index - 1]) return {};

        next[index - 1] = { ...next[index - 1], c: connection };
        return { body: next };
      }
    }
  }
}

export function getConnection(shape: LineShape, index: number): ConnectionPoint | undefined {
  const vertices = getLinePath(shape);
  switch (index) {
    case 0:
      return shape.pConnection;
    case vertices.length - 1:
      return shape.qConnection;
    default:
      return shape.body?.[index - 1].c;
  }
}

export function getConnections(shape: LineShape): (ConnectionPoint | undefined)[] {
  const vertices = getLinePath(shape);
  return vertices.map((_, index) => {
    switch (index) {
      case 0:
        return shape.pConnection;
      case vertices.length - 1:
        return shape.qConnection;
      default:
        return shape.body?.[index - 1].c;
    }
  });
}

export function addNewVertex(shape: LineShape, index: number, p: IVec2, c?: ConnectionPoint): Partial<LineShape> {
  switch (index) {
    case 0:
      return {
        p,
        pConnection: c,
        body: shape.body
          ? [{ p: shape.p, c: shape.pConnection }, ...shape.body]
          : [{ p: shape.p, c: shape.pConnection }],
        curves: shape.curves ? [undefined, ...shape.curves] : undefined,
      };
    case 2 + (shape.body?.length ?? 0):
      return {
        body: shape.body
          ? [...shape.body, { p: shape.q, c: shape.qConnection }]
          : [{ p: shape.q, c: shape.qConnection }],
        q: p,
        qConnection: c,
      };
    default:
      if (shape.body && shape.body.length > 0) {
        const body = [...shape.body.slice(0, index - 1), { p, c }, ...shape.body.slice(index - 1)];
        if (shape.curves && shape.curves.length >= index) {
          const curves = shiftCurveAtVertex(
            [...shape.curves.slice(0, index - 1), undefined, ...shape.curves.slice(index - 1)],
            index,
            sub(p, index === 1 ? shape.p : shape.body[index - 2].p),
          );
          return { body, curves };
        } else {
          return { body };
        }
      } else {
        return {
          body: [{ p, c }],
          curves: shape.curves ? shiftCurveAtVertex([undefined, ...shape.curves], index, sub(p, shape.p)) : undefined,
        };
      }
  }
}

/**
 * Only inner vertices can be deleted.
 */
export function deleteVertex(shape: LineShape, index: number): Partial<LineShape> {
  if (!shape.body || shape.body?.length === 0) return {};

  const part: Partial<LineShape> = {};

  if (shape.curves && shape.curves.length > index) {
    // Delete corresponding curve.
    const targetC = shape.curves[index];
    if (isBezieirControl(targetC)) {
      part.curves = [];
      shape.curves.forEach((c, i) => {
        if (!isBezieirControl(c)) {
          part.curves!.push(c);
        } else if (i === index - 1) {
          // Preserve second bezier constrol of the target vertex when the former edge is also bezier.
          part.curves!.push({ c1: c.c1, c2: targetC.c2 });
        } else if (i !== index) {
          part.curves!.push(c);
        }
      });
    } else {
      part.curves = shape.curves.filter((_, i) => i !== index);
    }
  }

  const vertices = getLinePath(shape);
  if (index === 0) {
    return {
      ...part,
      p: shape.body[0].p,
      pConnection: shape.body[0].c,
      body: shape.body.length === 1 ? undefined : shape.body.slice(1),
    };
  }
  if (index === vertices.length - 1) {
    const bodyLastIndex = shape.body.length - 1;
    return {
      ...part,
      q: shape.body[bodyLastIndex].p,
      qConnection: shape.body[bodyLastIndex].c,
      body: shape.body.length === 1 ? undefined : shape.body.slice(0, bodyLastIndex),
    };
  }

  const body = shape.body.filter((_, i) => i !== index - 1);
  return { ...part, body: body.length > 0 ? body : undefined };
}

export function isLineShape(shape: Shape): shape is LineShape {
  return shape.type === "line";
}

export function isCurveLine(shape: LineShape): shape is LineShape & Required<Pick<LineShape, "curves">> {
  return !!shape.curves;
}

export function getRelativePointOn(shape: LineShape, rate: number): IVec2 {
  return getRelativePointOnCurvePath(getLinePath(shape), shape.curves, rate);
}

export function getRadianP(shape: LineShape, originDistance?: number): number {
  return getRadian(shape.p, getForwardVicinity(shape, 0, originDistance));
}

export function getRadianQ(shape: LineShape, originDistance?: number): number {
  return getRadian(shape.q, getBackwardVicinity(shape, 1 + (shape.body?.length ?? 0), originDistance));
}

export function getForwardVicinity(shape: LineShape, index: number, originDistance?: number): IVec2 {
  const linePath = getLinePath(shape);
  if (linePath.length - 1 <= index) return shape.q;

  const p0 = linePath[index];
  const p1 = linePath[index + 1];
  const c = shape.curves?.[index];
  return getSegmentVicinityFrom([p0, p1], c, originDistance);
}

export function getBackwardVicinity(shape: LineShape, index: number, originDistance?: number): IVec2 {
  const linePath = getLinePath(shape);
  if (index === 0) return shape.p;
  if (linePath.length <= index) return shape.q;

  const q0 = linePath[index - 1];
  const q1 = linePath[index];
  const c = shape.curves?.[index - 1];
  return getSegmentVicinityTo([q0, q1], c, originDistance);
}

function isSameCurve(a: LineShape["curves"], b: LineShape["curves"]): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((s, i) => {
    const t = b[i];
    if (!s || !t) {
      return false;
    } else if ("d" in s && "d" in t) {
      return isSame(s.d, t.d);
    } else if ("c1" in s && "c1" in t) {
      return isSame(s.c1, t.c1) && isSame(s.c2, t.c2);
    } else {
      return false;
    }
  });
}

export function getLineWidth(shape: LineShape): number {
  if (shape.stroke.disabled) {
    const base = getStrokeWidth({ ...shape.stroke, disabled: false });
    return shape.fill.disabled ? 0 : base * 0.8;
  }
  return getStrokeWidth(shape.stroke);
}

export function renderLineStroke(ctx: CanvasCTX, shape: Pick<LineShape, "fill" | "stroke">) {
  if (!shape.fill.disabled) {
    applyStrokeStyle(ctx, { ...shape.stroke, disabled: false, color: shape.fill.color, dash: undefined });
    ctx.stroke();
    if (!shape.stroke.disabled) {
      applyStrokeStyle(ctx, { ...shape.stroke, width: getLineStrokeWidth(shape) });
      ctx.stroke();
    }
  } else {
    if (!shape.stroke.disabled) {
      applyStrokeStyle(ctx, shape.stroke);
      ctx.stroke();
    }
  }
}

export function createLineStrokeSVGElementInfo(shape: Pick<LineShape, "fill" | "stroke">, pathStr: string) {
  return shape.fill.disabled
    ? [
        {
          tag: "path",
          attributes: {
            d: pathStr,
            ...renderStrokeSVGAttributes(shape.stroke),
          },
        },
      ]
    : [
        {
          tag: "path",
          attributes: {
            d: pathStr,
            ...renderStrokeSVGAttributes({ ...shape.stroke, disabled: false, color: shape.fill.color }),
          },
        },
        {
          tag: "path",
          attributes: {
            d: pathStr,
            ...renderStrokeSVGAttributes({ ...shape.stroke, width: getLineStrokeWidth(shape) }),
          },
        },
      ];
}

function getLineStrokeWidth(shape: Pick<LineShape, "fill" | "stroke">): number {
  return getStrokeWidth(shape.stroke) * (shape.fill.disabled ? 1 : 0.8);
}

function getHeadAffines(shape: LineShape): { pAffine?: AffineMatrix; qAffine?: AffineMatrix } {
  let pAffine: AffineMatrix | undefined;
  if (shape.pHead) {
    const p = shape.p;
    const r = getRadianP(shape, getLineHeadRotationOriginDistance(shape.pHead, getLineStrokeWidth(shape)));
    const sin = Math.sin(r);
    const cos = Math.cos(r);
    pAffine = multiAffines([
      [1, 0, 0, 1, p.x, p.y],
      [cos, sin, -sin, cos, 0, 0],
    ]);
  }

  let qAffine: AffineMatrix | undefined;
  if (shape.qHead) {
    const q = shape.q;
    const r = getRadianQ(shape, getLineHeadRotationOriginDistance(shape.qHead, getLineStrokeWidth(shape)));
    const sin = Math.sin(r);
    const cos = Math.cos(r);
    qAffine = multiAffines([
      [1, 0, 0, 1, q.x, q.y],
      [cos, sin, -sin, cos, 0, 0],
    ]);
  }

  return {
    pAffine,
    qAffine,
  };
}

export function combineJumps(shape: LineShape, jumps?: ISegment[][]): { path: IVec2[]; curves: LineShape["curves"] } {
  const srcPath = getLinePath(shape);
  if (!jumps) {
    return { path: srcPath, curves: shape.curves };
  }

  const srcCurves = shape.curves ?? [];
  const path: IVec2[] = [];
  const curves: LineShape["curves"] = [];
  srcPath.forEach((p, i) => {
    if (i === 0) {
      path.push(p);
      return;
    }

    const curve = srcCurves[i - 1];
    if (curve) {
      path.push(p);
      curves.push(curve);
      return;
    }

    curves.push(undefined);

    const jump = jumps[i - 1];
    if (jump.length === 0) {
      path.push(p);
      return;
    }

    jump.forEach((seg) => {
      path.push(seg[0]);
      curves.push({ d: { x: 0, y: (LINE_JUMP_BASE_INTERVAL + getLineWidth(shape)) / 2 } });
      path.push(seg[1]);
      curves.push(undefined);
    });

    path.push(p);
  });

  return { path, curves };
}

function getLineLocalRectPolygon(shape: LineShape, shapeContext?: ShapeContext, includeBounds = false) {
  const wrapper = getWrapperRectWithoutRotation(shape, shapeContext, includeBounds);
  if (!shapeContext || !shape.parentId) return getRectPoints(wrapper);

  const parent = shapeContext.shapeMap[shape.parentId];
  if (!parent || parent.rotation === 0) return getRectPoints(wrapper);

  // Lines basically don't have the concept of rotation.
  // When a line has a rotated parent, let the line inherit the rotation to derive its local-rect polygon.
  // => This behavior can optimize the bounds of parent group shape.
  const c = getRectCenter(wrapper);
  const derotateAffine = getRotatedAtAffine(c, -parent.rotation);
  const derotated = { ...shape, ...struct.resize(shape, derotateAffine) };
  const derotatedWrapper = getWrapperRectWithoutRotation(derotated, shapeContext, includeBounds);
  const rotateAffine = getRotatedAtAffine(c, parent.rotation);
  return getRectPoints(derotatedWrapper).map((p) => applyAffine(rotateAffine, p));
}

function getWrapperRectWithoutRotation(
  shape: LineShape,
  shapeContext?: ShapeContext,
  includeBounds = false,
): IRectangle {
  const curvePath = combineJumps(shape, shapeContext?.lineJumpMap.get(shape.id));
  // Regard curves only when bounds included.
  // => Otherwise, the bounds doesn't represent vertices.
  let rect = includeBounds
    ? getCurveSplineBounds(curvePath.path, curvePath.curves)
    : getCurveSplineBounds(getLinePath(shape), undefined);

  if (includeBounds) {
    const affines = getHeadAffines(shape);
    const headRects: IRectangle[] = [];
    if (shape.pHead && affines.pAffine) {
      const srcPath = getLineHeadWrapperSrcPath(shape.pHead, shape.stroke.width ?? 1);
      headRects.push(getOuterRectangle([srcPath.map((p) => applyAffine(affines.pAffine!, p))]));
    }
    if (shape.qHead && affines.qAffine) {
      const srcPath = getLineHeadWrapperSrcPath(shape.qHead, shape.stroke.width ?? 1);
      headRects.push(getOuterRectangle([srcPath.map((p) => applyAffine(affines.qAffine!, p))]));
    }
    rect = headRects.length > 0 ? getWrapperRect([rect, ...headRects]) : rect;
  }

  if (includeBounds) {
    // FIXME: This expanding isn't precise but just large enough.
    rect = expandRect(rect, getLineWidth(shape) / 1.9);
  }

  return rect;
}
