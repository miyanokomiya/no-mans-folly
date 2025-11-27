import { getLinePath, LineShape } from "../../../../shapes/line";
import { AppCanvasEvent, AppCanvasState, AppCanvasStateContext } from "../core";

type PartialCTX = {
  getShapeComposite: AppCanvasStateContext["getShapeComposite"];
  states: { newSelectionHubState: () => AppCanvasState };
};

/**
 * Finishes the state when the shape updates.
 */
export function handleShapeUpdate(ctx: PartialCTX, event: AppCanvasEvent, shapeIds: string[]) {
  if (event.type !== "shape-updated") return;

  for (const id of shapeIds) {
    if (event.data.keys.has(id)) {
      return ctx.states.newSelectionHubState;
    }
  }
}

/**
 * Finishes the state when the line or the vertex no longer exists.
 */
export function handleLineVertexExistence(ctx: PartialCTX, event: AppCanvasEvent, lineId: string, vertexIndex: number) {
  if (event.type !== "shape-updated") return;

  if (event.data.keys.has(lineId)) {
    const line = ctx.getShapeComposite().mergedShapeMap[lineId] as LineShape;
    if (!line || getLinePath(line).length <= vertexIndex) return ctx.states.newSelectionHubState;
  }
}
