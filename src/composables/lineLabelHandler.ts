import { IVec2 } from "okageo";
import { EntityPatchInfo, Shape } from "../models";
import { LineShape, getLinePath, getRelativePointOn, isLineShape } from "../shapes/line";
import { TextShape, isLineLabelShape, patchPosition } from "../shapes/text";
import { applyFillStyle } from "../utils/fillStyle";
import { TAU } from "../utils/geometry";
import { attachLabelToLine } from "../utils/lineLabel";
import { applyCurvePath } from "../utils/renderer";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { ShapeComposite } from "./shapeComposite";
import { AppCanvasStateContext } from "./states/appCanvas/core";

interface Option {
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">;
}

export function newLineLabelHandler(option: Option) {
  function onModified(updatedMap: { [id: string]: Partial<Shape> }): { [id: string]: Partial<Shape> } {
    const shapeMap = option.ctx.getShapeComposite().shapeMap;
    const shapeList = Object.values(shapeMap);
    const updatedEntries = Object.entries(updatedMap);

    const ret: { [id: string]: Partial<Shape> } = {};

    updatedEntries.forEach(([lineId, patch]) => {
      const src = shapeMap[lineId];
      if (!src || !isLineShape(src)) return;

      const patchedLine: LineShape = { ...src, ...patch };
      const labels = shapeList.filter((s): s is TextShape => isLineLabelShape(s) && s.parentId === lineId);
      labels.forEach((label) => {
        const origin = getRelativePointOn(patchedLine, label.lineAttached ?? 0.5);
        const labelPatch = patchPosition(label, origin, getLabelMargin(patchedLine));
        if (labelPatch) {
          ret[label.id] = labelPatch;
        }
      });
    });

    updatedEntries.forEach(([labelId, patch]) => {
      const shape = shapeMap[labelId];
      if (!shape || !isLineLabelShape(shape) || !shape.parentId) return;

      const label = { ...shape, ...patch } as TextShape;
      const line = { ...shapeMap[shape.parentId], ...(updatedMap[shape.parentId] ?? {}) } as LineShape;
      ret[labelId] = attachLabelToLine(line, label, getLabelMargin(line));
    });

    return ret;
  }

  return { onModified };
}
export type LineLabelHandler = ReturnType<typeof newLineLabelHandler>;

export function renderParentLineRelation(
  ctx: Pick<AppCanvasStateContext, "getStyleScheme" | "getScale">,
  renderCtx: CanvasRenderingContext2D,
  textShape: TextShape,
  parentLineShape: LineShape,
) {
  const path = getLinePath(parentLineShape);
  applyStrokeStyle(renderCtx, { color: ctx.getStyleScheme().selectionSecondaly, width: 2 * ctx.getScale() });
  renderCtx.beginPath();
  applyCurvePath(renderCtx, path, parentLineShape.curves);
  renderCtx.stroke();
  const origin = getRelativePointOn(parentLineShape, textShape.lineAttached ?? 0);
  applyFillStyle(renderCtx, { color: ctx.getStyleScheme().selectionPrimary });
  renderCtx.beginPath();
  renderCtx.arc(origin.x, origin.y, 3 * ctx.getScale(), 0, TAU);
  renderCtx.fill();
}

function getLabelMargin(line: LineShape): number {
  return (line.stroke.width ?? 1) / 2 + 6;
}

/**
 * Returns patch object to update the lable's aligns and position based on the parent line and the given point.
 */
export function getPatchByUpdateLabelAlign(parentLine: LineShape, label: TextShape, targetP: IVec2, scale = 1) {
  const origin = getRelativePointOn(parentLine, label.lineAttached ?? 0.5);
  const size = 20 * scale;
  let patched: Partial<TextShape> = {
    hAlign: targetP.x < origin.x - size ? "right" : origin.x + size < targetP.x ? "left" : "center",
    vAlign: targetP.y < origin.y - size ? "bottom" : origin.y + size < targetP.y ? "top" : "center",
  };
  patched = { ...patched, ...patchPosition({ ...label, ...patched }, origin, getLabelMargin(parentLine)) };

  if (patched.hAlign === label.hAlign) {
    delete patched.hAlign;
  }
  if (patched.vAlign === label.vAlign) {
    delete patched.vAlign;
  }

  return patched;
}

export function getLineLabelPatch(srcComposite: ShapeComposite, patchInfo: EntityPatchInfo<Shape>) {
  if (!patchInfo.update) return {};

  const handler = newLineLabelHandler({
    ctx: { getShapeComposite: () => srcComposite },
  });
  return handler.onModified(patchInfo.update);
}
