import {
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
} from "./commons";
import { newSelectionHubState } from "./selectionHubState";
import { CONTEXT_MENU_SHAPE_SELECTED_ITEMS } from "./contextMenuItems";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { newResizingState } from "./resizingState";
import { newRotatingState } from "./rotatingState";
import { defineIntransientState } from "./intransientState";
import { newPointerDownEmptyState } from "./pointerDownEmptyState";
import { AppCanvasState, AppCanvasStateContext } from "./core";
import { Shape } from "../../../models";
import { ShapeHandler } from "../../shapeHandlers/core";

interface SingleSelectedHandlerStateGetters {
  getTargetShape: () => Shape;
  getShapeHandler: () => ShapeHandler;
  getBoundingBox: () => BoundingBox;
}

export function defineSingleSelectedHandlerState<A extends any[]>(
  createFn: (getters: SingleSelectedHandlerStateGetters, ...o: A) => AppCanvasState,
  newHandlerFn: (ctx: AppCanvasStateContext, targetShape: Shape) => ShapeHandler,
): (...o: A) => AppCanvasState {
  return defineIntransientState((...o: A) => {
    let targetShape: Shape;
    let shapeHandler: ShapeHandler;
    let boundingBox: BoundingBox;

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
        targetShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""];
        shapeHandler = newHandlerFn(ctx, targetShape);

        const shapeComposite = ctx.getShapeComposite();
        boundingBox = newBoundingBox({
          path: shapeComposite.getLocalRectPolygon(targetShape),
        });

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

        switch (event.type) {
          case "pointerdown":
            ctx.setContextMenuList();

            switch (event.data.options.button) {
              case 0: {
                const res = src.handleEvent(ctx, event);
                if (res) return res;

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
            break;
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

        return src.handleEvent(ctx, event);
      },
      render: (ctx, renderCtx) => {
        boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
        shapeHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());

        src.render?.(ctx, renderCtx);
      },
    };
  });
}
