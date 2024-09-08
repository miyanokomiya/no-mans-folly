import {
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
} from "./commons";
import { newSelectionHubState } from "./selectionHubState";
import { getMenuItemsForSelectedShapes } from "./contextMenuItems";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { newResizingState } from "./resizingState";
import { newRotatingState } from "./rotatingState";
import { defineIntransientState } from "./intransientState";
import { newPointerDownEmptyState } from "./pointerDownEmptyState";
import { AppCanvasState, AppCanvasStateContext } from "./core";
import { Shape } from "../../../models";
import { newDummyHandler, ShapeHandler } from "../../shapeHandlers/core";
import { newMovingHubState } from "./movingHubState";
import { newSmartBranchHandler, SmartBranchHandler } from "../../smartBranchHandler";
import { canAttachSmartBranch } from "../../../shapes";

interface SingleSelectedHandlerStateGetters<S extends Shape, H extends ShapeHandler> {
  getTargetShape: () => S;
  getShapeHandler: () => H;
  getBoundingBox: () => BoundingBox;
}

/**
 * "handleEvent" can be overridden by returning "null" from the custom handler.
 */
export function defineSingleSelectedHandlerState<S extends Shape, H extends ShapeHandler, A extends any[]>(
  createFn: (getters: SingleSelectedHandlerStateGetters<S, H>, ...o: A) => AppCanvasState,
  newHandlerFn?: (ctx: AppCanvasStateContext, targetShape: S) => H,
): (...o: A) => AppCanvasState {
  return defineIntransientState((...o: A) => {
    let targetShape: S;
    let shapeHandler: H;
    let boundingBox: BoundingBox;
    let smartBranchHandler: SmartBranchHandler | undefined;

    const src = createFn(
      {
        getTargetShape: () => targetShape,
        getShapeHandler: () => shapeHandler,
        getBoundingBox: () => boundingBox,
      },
      ...o,
    );

    return {
      ...src,
      onStart: (ctx) => {
        ctx.showFloatMenu();
        ctx.setCommandExams([]);
        targetShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as S;
        shapeHandler = newHandlerFn?.(ctx, targetShape) ?? (newDummyHandler({}) as H);

        const shapeComposite = ctx.getShapeComposite();
        boundingBox = newBoundingBox({
          path: shapeComposite.getLocalRectPolygon(targetShape),
          locked: targetShape.locked,
        });

        if (!shapeComposite.hasParent(targetShape) && canAttachSmartBranch(ctx.getShapeStruct, targetShape)) {
          smartBranchHandler = newSmartBranchHandler({
            getShapeComposite: ctx.getShapeComposite,
            targetId: targetShape.id,
          });
        }

        src.onStart?.(ctx);
      },
      onEnd: (ctx) => {
        ctx.hideFloatMenu();
        ctx.setCommandExams();
        ctx.setContextMenuList();
        ctx.setCursor();

        src.onEnd?.(ctx);
      },
      handleEvent: (ctx, event) => {
        if (!targetShape) return newSelectionHubState;

        const res = src.handleEvent(ctx, event);
        if (res !== undefined) return res;

        switch (event.type) {
          case "pointerdown": {
            ctx.setContextMenuList();

            switch (event.data.options.button) {
              case 0: {
                const boundingHitResult = boundingBox.hitTest(event.data.point, ctx.getScale());
                if (boundingHitResult) {
                  switch (boundingHitResult.type) {
                    case "corner":
                    case "segment":
                      return () => newResizingState({ boundingBox, hitResult: boundingHitResult });
                    case "rotation":
                      return () => newRotatingState({ boundingBox });
                    case "move":
                      return () => newMovingHubState({ boundingBox });
                  }
                }

                if (smartBranchHandler) {
                  const smartBranchHitResult = smartBranchHandler.hitTest(event.data.point, ctx.getScale());
                  if (smartBranchHitResult) {
                    const branchShapes = smartBranchHandler.createBranch(smartBranchHitResult, ctx.generateUuid);
                    ctx.addShapes(branchShapes);
                    ctx.selectShape(branchShapes[0].id);
                    return;
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
                return () => newPointerDownEmptyState(event.data.options);
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
          }
          case "pointerhover": {
            const nextHitResult = shapeHandler.hitTest(event.data.current, ctx.getScale());
            if (shapeHandler.saveHitResult(nextHitResult)) {
              ctx.redraw();
            }

            if (nextHitResult) {
              boundingBox.saveHitResult();
              smartBranchHandler?.saveHitResult();
              return;
            }

            const hitBounding = boundingBox.hitTest(event.data.current, ctx.getScale());
            if (boundingBox.saveHitResult(hitBounding)) {
              ctx.redraw();
            }

            if (hitBounding) {
              smartBranchHandler?.saveHitResult();
              return;
            }

            if (smartBranchHandler) {
              const smartBranchHitResult = smartBranchHandler.hitTest(event.data.current, ctx.getScale());
              if (smartBranchHandler.saveHitResult(smartBranchHitResult)) {
                ctx.redraw();
                return;
              }
            }

            break;
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

        return src.handleEvent(ctx, event);
      },
      render: (ctx, renderCtx) => {
        boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
        smartBranchHandler?.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
        shapeHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());

        src.render?.(ctx, renderCtx);
      },
    };
  });
}
