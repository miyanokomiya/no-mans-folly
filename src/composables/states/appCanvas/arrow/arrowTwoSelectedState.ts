import type { AppCanvasState } from "../core";
import { newPanningState } from "../../commons";
import {
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
  startTextEditingIfPossible,
} from "../commons";
import { newSelectionHubState } from "../selectionHubState";
import { CONTEXT_MENU_SHAPE_SELECTED_ITEMS } from "../contextMenuItems";
import { BoundingBox, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { newRotatingState } from "../rotatingState";
import { TwoSidedArrowShape } from "../../../../shapes/twoSidedArrow";
import { newArrowTwoHandler } from "../../../shapeHandlers/arrowTwoHandler";
import { newMovingArrowHeadState } from "./movingArrowHeadState";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { newMovingArrowToState } from "./movingArrowToState";
import { newMovingArrowFromState } from "./movingArrowFromState";
import { getArrowDirection } from "../../../../utils/arrows";
import { ShapeHandler } from "../../../shapeHandlers/core";

export function newArrowTwoSelectedState(): AppCanvasState {
  let targetShape: TwoSidedArrowShape;
  let shapeHandler: ShapeHandler;
  let boundingBox: BoundingBox;

  return {
    getLabel: () => "ArrowTwoSelected",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      ctx.setCommandExams([]);
      ctx.setCursor();
      targetShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as TwoSidedArrowShape;
      shapeHandler = newArrowTwoHandler({ getShapeComposite: ctx.getShapeComposite, targetId: targetShape.id });

      const shapeComposite = ctx.getShapeComposite();
      boundingBox = newBoundingBox({
        path: shapeComposite.getLocalRectPolygon(targetShape),
      });
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setCommandExams();
      ctx.setContextMenuList();
      ctx.setCursor();
    },
    handleEvent: (ctx, event) => {
      if (!targetShape) return newSelectionHubState;

      switch (event.type) {
        case "pointerdown":
          ctx.setContextMenuList();

          switch (event.data.options.button) {
            case 0: {
              const hitResult = shapeHandler.hitTest(event.data.point, ctx.getScale());
              shapeHandler.saveHitResult(hitResult);
              if (hitResult) {
                switch (hitResult.type) {
                  case "head":
                    return () => newMovingArrowHeadState({ targetId: targetShape.id });
                  case "to":
                    return () => newMovingArrowToState({ targetId: targetShape.id });
                  case "from":
                    return () => newMovingArrowFromState({ targetId: targetShape.id });
                  case "direction": {
                    const shapeComposite = ctx.getShapeComposite();
                    const patch = {
                      direction: (getArrowDirection(targetShape) + 1) % 2,
                    } as Partial<TwoSidedArrowShape>;
                    const layoutPatch = getPatchByLayouts(shapeComposite, {
                      update: { [targetShape.id]: patch },
                    });
                    ctx.patchShapes(layoutPatch);
                    return newSelectionHubState;
                  }
                  default:
                    return;
                }
              }

              const boundingHitResult = boundingBox.hitTest(event.data.point, ctx.getScale());
              if (boundingHitResult) {
                switch (boundingHitResult.type) {
                  case "corner":
                  case "segment":
                    return () => newResizingState({ boundingBox, hitResult: boundingHitResult });
                  case "rotation":
                    return () => newRotatingState({ boundingBox });
                }
              }

              return handleCommonPointerDownLeftOnSingleSelection(
                ctx,
                event,
                targetShape.id,
                ctx.getShapeComposite().getSelectionScope(targetShape),
              );
            }
            case 1:
              return { type: "stack-resume", getState: newPanningState };
            case 2: {
              return handleCommonPointerDownRightOnSingleSelection(
                ctx,
                event,
                targetShape.id,
                ctx.getShapeComposite().getSelectionScope(targetShape),
              );
            }
            default:
              return;
          }
        case "pointerdoubledown": {
          const hitResult = boundingBox.hitTest(event.data.point, ctx.getScale());
          if (hitResult) {
            return startTextEditingIfPossible(ctx, targetShape.id, event.data.point);
          }
          return;
        }
        case "pointerhover": {
          const nextHitResult = shapeHandler.hitTest(event.data.current, ctx.getScale());
          if (shapeHandler.saveHitResult(nextHitResult)) {
            ctx.redraw();
          }

          if (nextHitResult) {
            boundingBox.saveHitResult();
            return;
          }

          const hitBounding = boundingBox.hitTest(event.data.current, ctx.getScale());
          if (boundingBox.saveHitResult(hitBounding)) {
            ctx.redraw();
          }

          if (hitBounding) {
            return;
          }

          return handleIntransientEvent(ctx, event);
        }
        case "shape-updated": {
          if (event.data.keys.has(targetShape.id)) {
            return newSelectionHubState;
          }
          return;
        }
        case "contextmenu":
          ctx.setContextMenuList({
            items: CONTEXT_MENU_SHAPE_SELECTED_ITEMS,
            point: event.data.point,
          });
          return;
        default:
          return handleIntransientEvent(ctx, event);
      }
    },
    render: (ctx, renderCtx) => {
      boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
      shapeHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
    },
  };
}
