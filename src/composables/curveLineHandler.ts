import { EntityPatchInfo, Shape } from "../models";
import { LineShape, getLinePath, isLineShape } from "../shapes/line";
import { applyCornerRadius, getAutomaticCurve } from "../utils/curveLine";
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
    if (src.curveType !== "auto") return;

    if (src.lineType === "elbow") {
      ret[id] = applyCornerRadius({ ...src, ...patch });
    } else {
      ret[id] = { curves: getAutomaticCurve(getLinePath({ ...src, ...patch })) };
    }
  });

  return ret;
}
