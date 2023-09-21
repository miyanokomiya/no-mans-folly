import { Shape } from "../models";
import { LineShape, getLinePath, isLineShape } from "../shapes/line";
import { TextShape, isTextShape, patchPosition } from "../shapes/text";
import { applyFillStyle } from "../utils/fillStyle";
import { getRelativePointOnPath } from "../utils/geometry";
import { attachLabelToLine } from "../utils/lineLabel";
import { applyPath } from "../utils/renderer";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { AppCanvasStateContext } from "./states/appCanvas/core";

interface Option {
  ctx: Pick<AppCanvasStateContext, "getShapeMap" | "getShapeStruct">;
}

export function newLineLabelHandler(option: Option) {
  function onModified(updatedMap: { [id: string]: Partial<Shape> }): { [id: string]: Partial<Shape> } {
    const shapeMap = option.ctx.getShapeMap();
    const shapeList = Object.values(shapeMap);
    const updatedEntries = Object.entries(updatedMap);

    const ret: { [id: string]: Partial<Shape> } = {};

    updatedEntries.forEach(([lineId, patch]) => {
      const src = shapeMap[lineId];
      if (!isLineShape(src)) return;

      const patchedLine: LineShape = { ...src, ...patch };
      const labels = shapeList.filter((s): s is TextShape => isTextShape(s) && s.parentId === lineId);
      labels.forEach((label) => {
        const origin = getRelativePointOnPath(getLinePath(patchedLine), label.lineAttached ?? 0.5);
        const labelPatch = patchPosition(label, origin, getLabelMargin(patchedLine));
        if (labelPatch) {
          ret[label.id] = labelPatch;
        }
      });
    });

    updatedEntries.forEach(([labelId, patch]) => {
      const shape = shapeMap[labelId];
      if (!isTextShape(shape) || !shape.parentId) return;

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
  parentLineShape: LineShape
) {
  const path = getLinePath(parentLineShape);
  applyStrokeStyle(renderCtx, { color: ctx.getStyleScheme().selectionSecondaly, width: 2 * ctx.getScale() });
  renderCtx.beginPath();
  applyPath(renderCtx, path);
  renderCtx.stroke();
  const origin = getRelativePointOnPath(path, textShape.lineAttached ?? 0);
  applyFillStyle(renderCtx, { color: ctx.getStyleScheme().selectionPrimary });
  renderCtx.beginPath();
  renderCtx.arc(origin.x, origin.y, 3 * ctx.getScale(), 0, Math.PI * 2);
  renderCtx.fill();
}

function getLabelMargin(line: LineShape): number {
  return (line.stroke.width ?? 1) / 2 + 6;
}
