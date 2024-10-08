import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getStructForSimplePolygon } from "../simplePolygon";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { LineBodyItem, LineShape } from "../line";
import { Shape } from "../../models";

export type LinePolygonShape = SimplePolygonShape & {
  path: SimplePath;
  srcLine: Pick<LineShape, "curves" | "lineType" | "curveType"> & {
    vertices: LineBodyItem[];
  };
};

export const struct: ShapeStruct<LinePolygonShape> = {
  ...getStructForSimplePolygon<LinePolygonShape>(getPath),
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

export function canMakePolygon(line: LineShape): boolean {
  if (line.lineType === "elbow") return false;
  if (!!line.body && line.body.length > 0) return true;
  // When a line has a curved segment, it can consist a polygon.
  return !!line.curves && !!line.curves[0];
}
