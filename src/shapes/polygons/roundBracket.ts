import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, getStructForSimplePolygon } from "../simplePolygon";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { getBracketThickness, getBracketRadius, getBracketPath, BracketShape } from "./bracket";

export type RoundBracketShape = BracketShape;

export const struct: ShapeStruct<RoundBracketShape> = {
  ...getStructForSimplePolygon<RoundBracketShape>(getPath),
  label: "RoundBracket",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "round_bracket",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 50,
      height: arg.height ?? 100,
      thickness: 10,
      r: 50,
    };
  },
  getTextRangeRect: undefined,
  getTextPadding: undefined,
  patchTextPadding: undefined,
};

function getPath(shape: RoundBracketShape): SimplePath {
  const w = shape.width;
  const h = shape.height;
  const thickness = getBracketThickness(shape);
  const r = getBracketRadius(shape);
  return getBracketPath(w, h, thickness, r, true);
}
