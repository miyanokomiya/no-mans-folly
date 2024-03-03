import { applyPath } from "../../../utils/renderer";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { handleStateEvent } from "./commons";
import { AppCanvasState } from "./core";
import { newSelectionHubState } from "./selectionHubState";

export function newShapeInspectionState(): AppCanvasState {
  let selectedId: string | undefined;

  return {
    getLabel: () => "ShapeInspection",
    onStart: (ctx) => {
      selectedId = ctx.getLastSelectedShapeId();
      if (!selectedId) return newSelectionHubState;
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "state":
          return handleStateEvent(ctx, event, ["Break"]);
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      if (!selectedId) return;

      const shapeComposite = ctx.getShapeComposite();
      const shape = shapeComposite.mergedShapeMap[selectedId];
      if (!shape) return;

      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();
      applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: 2 * scale });

      const polygon = shapeComposite.getLocalRectPolygon(shape);
      renderCtx.beginPath();
      applyPath(renderCtx, polygon, true);
      renderCtx.stroke();
    },
  };
}
