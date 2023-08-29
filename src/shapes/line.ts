import { IVec2, applyAffine, getOuterRectangle, isSame } from "okageo";
import { ConnectionPoint, FillStyle, Shape, StrokeStyle } from "../models";
import { createFillStyle } from "../utils/fillStyle";
import { ISegment, getRectPoints, isPointCloseToSegment } from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape } from "./core";

export interface LineShape extends Shape {
  fill: FillStyle;
  stroke: StrokeStyle;
  q: IVec2;
  pConnection?: ConnectionPoint;
  qConnection?: ConnectionPoint;
}

export const struct: ShapeStruct<LineShape> = {
  label: "Line",
  create(arg = {}) {
    const obj: LineShape = {
      ...createBaseShape(arg),
      type: "line",
      rotation: 0, // should always be "0" or just ignored
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      q: arg.q ?? { x: 100, y: 0 },
    };
    if (arg.pConnection) obj.pConnection = arg.pConnection;
    if (arg.qConnection) obj.qConnection = arg.qConnection;
    return obj;
  },
  render(ctx, shape) {
    applyStrokeStyle(ctx, shape.stroke);

    ctx.beginPath();
    getLinePath(shape).forEach((p) => {
      ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  },
  getWrapperRect(shape) {
    return getOuterRectangle([getLinePath(shape)]);
  },
  getLocalRectPolygon(shape) {
    return getRectPoints(getOuterRectangle([getLinePath(shape)]));
  },
  isPointOn(shape, p) {
    return isPointCloseToSegment(getLinePath(shape), p, 10);
  },
  resize(shape, resizingAffine) {
    const [p, q] = getLinePath(shape).map((p) => applyAffine(resizingAffine, p));

    const ret: Partial<LineShape> = {};
    if (!isSame(p, shape.p)) ret.p = p;
    if (!isSame(q, shape.q)) ret.q = q;

    return ret;
  },
};

export function getLinePath(shape: LineShape): IVec2[] {
  return [shape.p, shape.q];
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

export function patchVertex(shape: LineShape, index: number, p: IVec2): Partial<LineShape> {
  const vertices = getLinePath(shape);
  switch (index) {
    case 0:
      return { p };
    case vertices.length - 1:
      return { q: p };
    default:
      return {};
  }
}

export function patchConnection(shape: LineShape, index: number, connection?: ConnectionPoint): Partial<LineShape> {
  if (index === 0) {
    if (!shape.pConnection && !connection) return {};
    if (shape.pConnection && !connection) return { pConnection: undefined };
    return { pConnection: connection };
  } else {
    if (!shape.qConnection && !connection) return {};
    if (shape.qConnection && !connection) return { qConnection: undefined };
    return { qConnection: connection };
  }
}

export function getConnection(shape: LineShape, index: number): ConnectionPoint | undefined {
  return index === 0 ? shape.pConnection : shape.qConnection;
}