import { ShapeStruct, THRESHOLD_FOR_SEGMENT, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { LineBodyItem, LineShape } from "../line";
import { Shape } from "../../models";
import { AffineMatrix, applyAffine } from "okageo";
import { transformBezierCurveControl } from "../../utils/path";
import { getShapeDetransform, isSizeChanged } from "../rectPolygon";
import { isPointCloseToCurveSpline } from "../../utils/geometry";

export type LinePolygonShape = SimplePolygonShape & {
  path: SimplePath;
  srcLine?: Pick<LineShape, "curves" | "lineType" | "curveType"> & {
    vertices: LineBodyItem[];
  };
};

const baseStruct = getStructForSimplePolygon<LinePolygonShape>(getPath);

export const struct: ShapeStruct<LinePolygonShape> = {
  ...baseStruct,
  label: "LinePolygon",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "line_polygon",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      path: arg.path ?? { path: [] },
      srcLine: arg.srcLine ?? { vertices: [] },
    };
  },
  isPointOn(shape, p, shapeContext, scale = 1) {
    if (isStraightSegment(shape.path)) {
      const detransform = getShapeDetransform(shape);
      const localP = applyAffine(detransform, p);
      if (isPointCloseToCurveSpline(shape.path.path, shape.path.curves, localP, THRESHOLD_FOR_SEGMENT * scale))
        return true;
    }
    return baseStruct.isPointOn(shape, p, shapeContext, scale);
  },
  resize(shape, resizingAffine) {
    const patch = baseStruct.resize(shape, resizingAffine);
    if (!isSizeChanged(shape, patch)) return patch;

    const ret: Partial<LinePolygonShape> = { ...patch };
    const affine: AffineMatrix = [
      shape.width === 0 ? 1 : (ret.width ?? shape.width) / shape.width,
      0,
      0,
      shape.height === 0 ? 1 : (ret.height ?? shape.height) / shape.height,
      0,
      0,
    ];

    ret.path = { path: shape.path.path.map((p) => applyAffine(affine, p)) };
    if (shape.path.curves) {
      ret.path.curves = shape.path.curves.map((c) => (c ? transformBezierCurveControl(c, affine) : c));
    }

    // Once the shape is resized, it can no longer retrieve the source line.
    // Because arc curves can't be resized unproportionally.
    ret.srcLine = undefined;

    return ret;
  },
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

function getPath(shape: LinePolygonShape): SimplePath {
  return shape.path;
}

export function isLinePolygonShape(shape: Shape): shape is LinePolygonShape {
  return shape.type === "line_polygon";
}

function isStraightSegment(path: SimplePath): boolean {
  return path.path.length === 2 && !path.curves?.at(0);
}
