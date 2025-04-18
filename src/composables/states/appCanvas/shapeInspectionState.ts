import { applyPath } from "../../../utils/renderer";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { handleStateEvent } from "./commons";
import { AppCanvasState } from "./core";

export function newShapeInspectionState(): AppCanvasState {
  let selectedIds: string[];

  return {
    getLabel: () => "ShapeInspection",
    onStart: (ctx) => {
      selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
      if (selectedIds.length === 0) return ctx.states.newSelectionHubState;
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          // This handling is intended as an escape hatch in case this state unexpectedly remains.
          ctx.setTmpShapeMap({});
          return ctx.states.newSelectionHubState;
        case "state":
          return handleStateEvent(ctx, event, ["Break"]);
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      if (selectedIds.length === 0) return;

      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();
      applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: 2 * scale });

      const shapeComposite = ctx.getShapeComposite();

      if (selectedIds.length === 1) {
        const shape = shapeComposite.mergedShapeMap[selectedIds[0]];

        const polygon = shapeComposite.getLocalRectPolygon(shape);
        renderCtx.beginPath();
        applyPath(renderCtx, polygon, true);
        renderCtx.stroke();
      } else {
        const shapes = selectedIds.map((id) => shapeComposite.mergedShapeMap[id]);

        const rect = shapeComposite.getWrapperRectForShapes(shapes);
        renderCtx.beginPath();
        renderCtx.rect(rect.x, rect.y, rect.width, rect.height);
        renderCtx.stroke();
      }
    },
  };
}
