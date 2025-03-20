import { Color, Shape, StyleScheme } from "../../../../models";
import { getMiddleColor } from "../../../../utils/color";

export function getShapeStatusColor(style: StyleScheme, shape: Pick<Shape, "locked" | "noExport">): Color | undefined {
  if (shape.locked && shape.noExport) return getMiddleColor(style.locked, style.noExport);
  if (shape.locked) return style.locked;
  if (shape.noExport) return style.noExport;
}
