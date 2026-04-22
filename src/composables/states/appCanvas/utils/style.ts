import { RGBA, Shape, StyleScheme } from "../../../../models";
import { getMiddleColor, resolveColor } from "../../../../utils/color";

export function getShapeStatusColor(style: StyleScheme, shape: Pick<Shape, "locked" | "noExport">): RGBA | undefined {
  if (shape.locked && shape.noExport)
    return getMiddleColor(resolveColor(style.locked, []), resolveColor(style.noExport, []));
  if (shape.locked) return resolveColor(style.locked, []);
  if (shape.noExport) return resolveColor(style.noExport, []);
}
