import {
  AffineMatrix,
  IRectangle,
  IVec2,
  applyAffine,
  getOuterRectangle,
  getPathPointAtLengthFromStructs,
  getRadian,
  getRectCenter,
  isSame,
  multiAffines,
  pathSegmentRawsToString,
} from "okageo";
import { ConnectionPoint, CurveControl, FillStyle, LineHead, Shape, StrokeStyle } from "../models";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../utils/fillStyle";
import {
  ISegment,
  expandRect,
  getCurveSplineBounds,
  getCurveLerpFn,
  getRectPoints,
  getRelativePointOnCurvePath,
  getWrapperRect,
  isPointCloseToCurveSpline,
  getCurvePathStructs,
  getRotatedAtAffine,
} from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle, getStrokeWidth, renderStrokeSVGAttributes } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape, getCommonStyle, updateCommonStyle } from "./core";
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

export type LineType = undefined | "elbow";
export type CurveType = undefined | "auto";

export interface LineShape extends Shape {
  fill: FillStyle;
  stroke: StrokeStyle;
  q: IVec2;
  pConnection?: ConnectionPoint;
  qConnection?: ConnectionPoint;
  pHead?: LineHead;
  qHead?: LineHead;
  body?: { p: IVec2; c?: ConnectionPoint }[];
  lineType?: LineType;
  /**
   * The first item represents body[0], the last one does "q" and others do "body".
   * "curves.length" should be equal to "body.length + 1"
   */
  curves?: (CurveControl | undefined)[];
  curveType?: CurveType;
}

export const struct: ShapeStruct<LineShape> = {
  label: "Line",
  create(arg = {}) {
    const obj: LineShape = {
      ...createBaseShape(arg),
      type: "line",
      rotation: 0, // should always be "0" or just ignored
      fill: arg.fill ?? createFillStyle({ disabled: true }),
      stroke: arg.stroke ?? createStrokeStyle({ width: 2 }),
      q: arg.q ?? { x: 100, y: 0 },
      pHead: arg.pHead,
      qHead: arg.qHead,
      body: arg.body,
      lineType: arg.lineType,
      curves: arg.curves,
      curveType: arg.curveType,
    };
    if (arg.pConnection) obj.pConnection = arg.pConnection;
    if (arg.qConnection) obj.qConnection = arg.qConnection;
    return obj;
  },
  render(ctx, shape, shapeContext) {
    applyStrokeStyle(ctx, { ...shape.stroke, dash: undefined });
    applyFillStyle(ctx, shape.fill);
    const treeNode = shapeContext?.treeNodeMap[shape.id];
    const linePath = getLinePath(shape);
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
    applyCurvePath(ctx, linePath, shape.curves);

    if (!shape.fill.disabled) {
      applyStrokeStyle(ctx, { ...shape.stroke, disabled: false, color: shape.fill.color, dash: undefined });
      ctx.stroke();
      if (!shape.stroke.disabled) {
        applyStrokeStyle(ctx, { ...shape.stroke, width: getLineStrokeWidth(shape) });
        ctx.stroke();
      }
    } else {
      applyStrokeStyle(ctx, shape.stroke);
      ctx.stroke();
    }

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
    const linePath = getLinePath(shape);
    const pathStr = pathSegmentRawsToString(createSVGCurvePath(linePath, shape.curves));
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

    const pHeadInfo = shape.pHead ? createLineHeadSVGElementInfo(shape.pHead, pAffine!, defaultWidth) : undefined;
    const qHeadInfo = shape.qHead ? createLineHeadSVGElementInfo(shape.qHead, qAffine!, defaultWidth) : undefined;

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
          children: [
            ...(shape.fill.disabled
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
                ]),
          ],
        },
        {
          tag: "g",
          attributes: {
            ...renderFillSVGAttributes({ ...shape.stroke, disabled: false }),
            ...renderStrokeSVGAttributes({ ...shape.stroke, disabled: false }),
          },
          children: [...(pHeadInfo ? [pHeadInfo] : []), ...(qHeadInfo ? [qHeadInfo] : [])],
        },
      ],
    };
  },
  getWrapperRect(shape, _, includeBounds) {
    const path = getLinePath(shape);
    let rect = getCurveSplineBounds(path, shape.curves);

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
  },
  getLocalRectPolygon(shape, shapeContext) {
    const wrapper = struct.getWrapperRect(shape);
    if (!shapeContext || !shape.parentId) return getRectPoints(wrapper);

    const parent = shapeContext.shapeMap[shape.parentId];
    if (parent.rotation === 0) return getRectPoints(wrapper);

    // Lines basically don't have the concept of rotation.
    // When a line has a rotated parent, let the line inherit the rotation to derive its local-rect polygon.
    // => This behavior can optimize the bounds of parent group shape.
    const c = getRectCenter(wrapper);
    const derotateAffine = getRotatedAtAffine(c, -parent.rotation);
    const derotated = { ...shape, ...struct.resize(shape, derotateAffine) };
    const derotatedWrapper = struct.getWrapperRect(derotated);
    const rotateAffine = getRotatedAtAffine(c, parent.rotation);
    return getRectPoints(derotatedWrapper).map((p) => applyAffine(rotateAffine, p));
  },
  isPointOn(shape, p, shapeContext, scale = 1) {
    if (isPointCloseToCurveSpline(getLinePath(shape), shape.curves, p, Math.max(shape.stroke.width ?? 1, 4 * scale)))
      return true;
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
    return {
      h: path.map((p) => [p, p]),
      v: path.map((p) => [p, p]),
    };
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
  switch (index) {
    case 0:
      return { p, pConnection: c };
    case vertices.length - 1:
      return { q: p, qConnection: c };
    default:
      return shape.body ? { body: shape.body.map((b, i) => (i + 1 === index ? { ...b, p, c } : b)) } : {};
  }
}

export function patchVertices(
  shape: LineShape,
  data: [index: number, p: IVec2, c: ConnectionPoint | undefined][],
): Partial<LineShape> {
  const vertices = getLinePath(shape);
  return data.reduce<Partial<LineShape>>((patch, [index, p, c]) => {
    switch (index) {
      case 0:
        patch.p = p;
        patch.pConnection = c;
        break;
      case vertices.length - 1:
        patch.q = p;
        patch.qConnection = c;
        break;
      default:
        if (shape.body) {
          patch.body ??= shape.body.concat();
          patch.body[index - 1] = { p, c };
        }
        break;
    }
    return patch;
  }, {});
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

export function addNewVertex(shape: LineShape, index: number, p: IVec2, c?: ConnectionPoint): Partial<LineShape> {
  switch (index) {
    case 0:
      return {};
    default:
      if (shape.body) {
        const body = [...shape.body.slice(0, index - 1), { p, c }, ...shape.body.slice(index - 1)];
        if (shape.curves && shape.curves.length > index) {
          // Insert new curve and let it inherit the previous one.
          const curves = [...shape.curves.slice(0, index), shape.curves[index - 1], ...shape.curves.slice(index)];
          return { body, curves };
        } else {
          return { body };
        }
      } else {
        return { body: [{ p, c }] };
      }
  }
}

/**
 * Only inner vertices can be deleted.
 */
export function deleteVertex(shape: LineShape, index: number): Partial<LineShape> {
  if (!shape.body) return {};

  const vertices = getLinePath(shape);
  if (0 === index || index === vertices.length - 1) return {};

  const body = shape.body.filter((_, i) => i !== index - 1);
  if (shape.curves && shape.curves.length > index) {
    // Delete corresponding curve.
    const curves = shape.curves.filter((_, i) => i !== index);
    return { body, curves };
  } else {
    return { body };
  }
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
  const linePath = getLinePath(shape);
  const p = linePath[0];

  let pVicinity = linePath[1];
  if (shape.curves && shape.curves[0]) {
    if (originDistance === undefined) {
      const lerpFn = getCurveLerpFn([p, linePath[1]], shape.curves[0]);
      pVicinity = lerpFn(0.01);
    } else {
      const pathStructs = getCurvePathStructs([p, linePath[1]], [shape.curves[0]]);
      pVicinity = getPathPointAtLengthFromStructs(pathStructs, originDistance);
    }
  }
  return getRadian(p, pVicinity);
}

export function getRadianQ(shape: LineShape, originDistance?: number): number {
  const linePath = getLinePath(shape);
  const q = linePath[linePath.length - 1];

  let qVicinity = linePath[linePath.length - 2];
  if (shape.curves && shape.curves[linePath.length - 2]) {
    if (originDistance === undefined) {
      const lerpFn = getCurveLerpFn([linePath[linePath.length - 2], q], shape.curves[linePath.length - 2]);
      qVicinity = lerpFn(0.99);
    } else {
      const pathStructs = getCurvePathStructs([linePath[linePath.length - 2], q], [shape.curves[linePath.length - 2]]);
      qVicinity = getPathPointAtLengthFromStructs(pathStructs, pathStructs[0].length - originDistance);
    }
  }
  return getRadian(q, qVicinity);
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

function getLineWidth(shape: LineShape): number {
  if (shape.stroke.disabled) {
    const base = getStrokeWidth({ ...shape.stroke, disabled: false });
    return shape.fill.disabled ? 0 : base * 0.8;
  }
  return getStrokeWidth(shape.stroke);
}

function getLineStrokeWidth(shape: LineShape): number {
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
