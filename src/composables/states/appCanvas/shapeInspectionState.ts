import { applyPath } from "../../../utils/renderer";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { handleStateEvent } from "./commons";
import { AppCanvasState } from "./core";
import { newSelectionHubState } from "./selectionHubState";

export function newShapeInspectionState(): AppCanvasState {
  let selectedIds: string[];

  return {
    getLabel: () => "ShapeInspection",
    onStart: (ctx) => {
      selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
      if (selectedIds.length === 0) return newSelectionHubState;
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
      const shapeComposite = ctx.getShapeComposite();
      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();
      applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: scale });

      if (selectedIds.length === 1) {
        const shape = shapeComposite.mergedShapeMap[selectedIds[0]];
        if (!shape) return;

        const polygon = shapeComposite.getLocalRectPolygon(shape);
        renderCtx.beginPath();
        applyPath(renderCtx, polygon, true);
        renderCtx.stroke();
      } else {
        const rect = shapeComposite.getWrapperRectForShapes(selectedIds.map((id) => shapeComposite.mergedShapeMap[id]));
        renderCtx.beginPath();
        renderCtx.rect(rect.x, rect.y, rect.width, rect.height);
        renderCtx.stroke();
      }
    },
  };
}
