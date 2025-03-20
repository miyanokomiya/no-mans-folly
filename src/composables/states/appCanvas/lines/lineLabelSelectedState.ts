import {
  getCommonCommandExams,
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
  startTextEditingIfPossible,
} from "../commons";
import { TextShape } from "../../../../shapes/text";
import { BoundingBox, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { LineShape } from "../../../../shapes/line";
import { renderParentLineRelation } from "../../../lineLabelHandler";
import { newRotatingLineLabelState } from "./rotatingLineLabelState";
import { getMenuItemsForSelectedShapes } from "../contextMenuItems";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { defineIntransientState } from "../intransientState";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";
import { AppCanvasState } from "../core";

interface Option {
  boundingBox?: BoundingBox;
}

export const newLineLabelSelectedState = defineIntransientState((option?: Option) => {
  let shape: TextShape;
  let parentLineShape: LineShape;
  let boundingBox: BoundingBox;

  const render: AppCanvasState["render"] = (ctx, renderCtx) => {
    renderParentLineRelation(ctx, renderCtx, shape, parentLineShape);
    boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
  };

  return {
    getLabel: () => "LineLabelSelected",
    onStart: (ctx) => {
      ctx.setCommandExams([COMMAND_EXAM_SRC.LABEL_ALIGN_ACTIVATE, ...getCommonCommandExams(ctx)]);

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const selectedId = ctx.getLastSelectedShapeId();
      shape = shapeMap[selectedId ?? ""] as TextShape;
      if (!shape) return ctx.states.newSelectionHubState;

      parentLineShape = shapeMap[shape.parentId ?? ""] as LineShape;
      if (!parentLineShape) return ctx.states.newSelectionHubState;

      ctx.showFloatMenu();

      boundingBox =
        option?.boundingBox ??
        newBoundingBox({
          path: shapeComposite.getLocalRectPolygon(shape),
          locked: shape.locked,
          noExport: shape.noExport,
        });
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setCursor();
      ctx.setContextMenuList();
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          ctx.setContextMenuList();

          switch (event.data.options.button) {
            case 0: {
              const hitResult = boundingBox.hitTest(event.data.point, ctx.getScale());
              if (hitResult) {
                switch (hitResult.type) {
                  case "corner":
                  case "segment":
                    return () => newResizingState({ boundingBox, hitResult });
                  case "rotation":
                    return () => newRotatingLineLabelState({ boundingBox });
                }
              }

              const shapeComposite = ctx.getShapeComposite();
              return handleCommonPointerDownLeftOnSingleSelection(
                ctx,
                event,
                shape.id,
                shapeComposite.getSelectionScope(shape),
                undefined,
                render,
              );
            }
            case 1:
              return () => newPointerDownEmptyState({ ...event.data.options, renderWhilePanning: render });
            case 2: {
              const shapeComposite = ctx.getShapeComposite();
              return handleCommonPointerDownRightOnSingleSelection(
                ctx,
                event,
                shape.id,
                shapeComposite.getSelectionScope(shape),
              );
            }
            default:
              return;
          }
        case "pointerhover": {
          const hitBounding = boundingBox.hitTest(event.data.current, ctx.getScale());
          if (boundingBox.saveHitResult(hitBounding)) {
            ctx.redraw();
          }
          break;
        }
        case "keydown":
          switch (event.data.key) {
            case "Enter":
              event.data.prevent?.();
              return startTextEditingIfPossible(ctx, shape.id);
            default:
              return handleIntransientEvent(ctx, event);
          }
        case "contextmenu":
          ctx.setContextMenuList({
            items: getMenuItemsForSelectedShapes(ctx),
            point: event.data.point,
          });
          return;
        default:
          return handleIntransientEvent(ctx, event);
      }
    },
    render,
  };
});
