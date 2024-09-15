import { EntityPatchInfo, Shape } from "../models";
import { LineShape, getLinePath, isLineShape } from "../shapes/line";
import { applyCornerRadius, getAutomaticCurve } from "../shapes/utils/curveLine";
import { ShapeComposite } from "./shapeComposite";

export function getCurveLinePatch(
  srcComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
): { [id: string]: Partial<LineShape> } {
  if (!patchInfo.update) return {};

  const ret: { [id: string]: Partial<LineShape> } = {};
  Object.entries(patchInfo.update).forEach(([id, patch]) => {
    const src = srcComposite.shapeMap[id];
    if (!isLineShape(src)) return;

    const updated = { ...src, ...patch };
    if (updated.curveType !== "auto") {
      if (src.curveType === "auto") {
        ret[id] = { curves: undefined };
      }
      return;
    }

    if (updated.lineType === "elbow") {
      ret[id] = applyCornerRadius(updated);
    } else {
      ret[id] = { curves: getAutomaticCurve(getLinePath(updated)) };
    }
  });

  return ret;
}
