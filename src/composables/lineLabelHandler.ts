import { Shape } from "../models";
import { LineShape, getLinePath, isLineShape } from "../shapes/line";
import { TextShape, isTextShape, patchPosition } from "../shapes/text";
import { getRelativePointOnPath } from "../utils/geometry";
import { attachLabelToLine } from "../utils/lineLabel";
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
    updatedEntries.forEach(([lineId, linePatch]) => {
      const src = shapeMap[lineId];
      if (!isLineShape(src)) return;

      const patchedLine: LineShape = { ...src, ...linePatch };
      const labels = shapeList.filter((s): s is TextShape => isTextShape(s) && s.parentId === lineId);
      labels.forEach((label) => {
        const origin = getRelativePointOnPath(getLinePath(patchedLine), label.lineAttached ?? 0.5);
        const labelPatch = patchPosition(label, origin);
        if (labelPatch) {
          ret[label.id] = labelPatch;
        }
      });
    });

    updatedEntries.forEach(([id, patch]) => {
      const shape = shapeMap[id];
      if (!isTextShape(shape) || !shape.parentId) return;

      const label = { ...shape, ...patch } as TextShape;
      const line = { ...shapeMap[shape.parentId], ...(ret[shape.parentId] ?? {}) } as LineShape;
      ret[id] = attachLabelToLine(line, label, (line.stroke.width ?? 1) / 2 + 6);
    });

    return ret;
  }

  return { onModified };
}
export type LineLabelHandler = ReturnType<typeof newLineLabelHandler>;
