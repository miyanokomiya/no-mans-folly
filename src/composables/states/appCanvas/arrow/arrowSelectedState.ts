import type { AppCanvasState } from "../core";
import { newPanningState } from "../../commons";
import {
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleCommonShortcut,
  handleIntransientEvent,
  startTextEditingIfPossible,
} from "../commons";
import { newSelectionHubState } from "../selectionHubState";
import { CONTEXT_MENU_ITEM_SRC } from "../contextMenuItems";
import { BoundingBox, HitResult, isSameHitResult, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { newRotatingState } from "../rotatingState";
import { OneSidedArrowShape, getArrowDirection } from "../../../../shapes/oneSidedArrow";
import { ArrowHandler, ArrowHitResult, newArrowHandler } from "../../../arrowHandler";
import { findBetterShapeAt } from "../../../shapeComposite";
import { newMovingArrowHeadState } from "./movingArrowHeadState";
import { newMovingArrowTailState } from "./movingArrowTailState";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { newMovingArrowToState } from "./movingArrowToState";
import { newMovingArrowFromState } from "./movingArrowFromState";

export function newArrowSelectedState(): AppCanvasState {
  let targetShape: OneSidedArrowShape;
  let shapeHandler: ArrowHandler;
  let hitResult: ArrowHitResult | undefined;
  let boundingBox: BoundingBox;
  let boundingHitResult: HitResult | undefined;

  return {
    getLabel: () => "ArrowSelected",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      ctx.setCommandExams([]);
      ctx.setCursor();
      targetShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as OneSidedArrowShape;
      shapeHandler = newArrowHandler({ getShapeComposite: ctx.getShapeComposite, targetId: targetShape.id });

      const shapeComposite = ctx.getShapeComposite();
      boundingBox = newBoundingBox({
        path: shapeComposite.getLocalRectPolygon(targetShape),
        styleScheme: ctx.getStyleScheme(),
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
              hitResult = shapeHandler.hitTest(event.data.point, ctx.getScale());
              if (hitResult) {
                switch (hitResult.type) {
                  case "head":
                    return () => newMovingArrowHeadState({ targetId: targetShape.id });
                  case "tail":
                    return () => newMovingArrowTailState({ targetId: targetShape.id });
                  case "to":
                    return () => newMovingArrowToState({ targetId: targetShape.id });
                  case "from":
                    return () => newMovingArrowFromState({ targetId: targetShape.id });
                  case "direction": {
                    const shapeComposite = ctx.getShapeComposite();
                    const patch = {
                      direction: (getArrowDirection(targetShape) + 1) % 4,
                    } as Partial<OneSidedArrowShape>;
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
          if (hitResult?.type !== nextHitResult?.type) {
            hitResult = nextHitResult;
            boundingHitResult = undefined;
            ctx.redraw();
            return;
          }

          const hitBounding = boundingBox.hitTest(event.data.current, ctx.getScale());
          if (!isSameHitResult(boundingHitResult, hitBounding)) {
            boundingHitResult = hitBounding;
            ctx.redraw();
          }
          if (boundingHitResult) {
            ctx.setCursor();
            return;
          }

          const shapeAtPointer = findBetterShapeAt(
            ctx.getShapeComposite(),
            event.data.current,
            ctx.getShapeComposite().getSelectionScope(targetShape),
          );
          ctx.setCursor(shapeAtPointer ? "pointer" : undefined);
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Delete":
              ctx.deleteShapes([targetShape.id]);
              return;
            default:
              return handleCommonShortcut(ctx, event);
          }
        case "shape-updated": {
          if (event.data.keys.has(targetShape.id)) {
            return newSelectionHubState;
          }
          return;
        }
        case "contextmenu":
          ctx.setContextMenuList({
            items: [CONTEXT_MENU_ITEM_SRC.EXPORT_AS_PNG, CONTEXT_MENU_ITEM_SRC.COPY_AS_PNG],
            point: event.data.point,
          });
          return;
        default:
          return handleIntransientEvent(ctx, event);
      }
    },
    render: (ctx, renderCtx) => {
      boundingBox.render(renderCtx, undefined, boundingHitResult, ctx.getScale());
      shapeHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale(), hitResult);
    },
  };
}
