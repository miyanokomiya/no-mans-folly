import { CONTEXT_MENU_ITEM_SRC, getMenuItemsForSelectedShapes, getPatchByDissolveShapes } from "../contextMenuItems";
import { AlignBoxShape } from "../../../../shapes/align/alignBox";
import { AlignBoxHandler, newAlignBoxHandler } from "../../../alignHandler";
import { getPatchByAlignBoxHitResult, handleAlignBoxHitResult } from "../align/utils";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";

export const newFrameAlignGroupSelectedState = defineSingleSelectedHandlerState<AlignBoxShape, AlignBoxHandler, []>(
  (getters) => {
    return {
      getLabel: () => "FrameAlignGroupSelected",
      onEnd: (ctx) => {
        ctx.setTmpShapeMap({});
      },
      handleEvent: (ctx, event) => {
        const targetShape = getters.getTargetShape();
        const shapeHandler = getters.getShapeHandler();

        switch (event.type) {
          case "pointerdown":
            switch (event.data.options.button) {
              case 0: {
                const hitResult = shapeHandler.hitTest(event.data.point, ctx.getScale());
                shapeHandler.saveHitResult(hitResult);
                if (!hitResult) return;

                return handleAlignBoxHitResult(ctx, targetShape, hitResult);
              }
              default:
                return;
            }
          case "pointerhover": {
            const hitResult = shapeHandler.retrieveHitResult();
            const patch = hitResult ? getPatchByAlignBoxHitResult(ctx, targetShape, hitResult) : undefined;
            ctx.setTmpShapeMap(patch ?? {});
            return;
          }
          case "contextmenu":
            ctx.setContextMenuList({
              items: [
                CONTEXT_MENU_ITEM_SRC.DISSOLVE_LAYOUT,
                CONTEXT_MENU_ITEM_SRC.SEPARATOR,
                ...getMenuItemsForSelectedShapes(ctx),
              ],
              point: event.data.point,
            });
            return null;
          case "contextmenu-item": {
            switch (event.data.key) {
              case CONTEXT_MENU_ITEM_SRC.DISSOLVE_LAYOUT.key: {
                const patch = getPatchByDissolveShapes(ctx.getShapeComposite(), [targetShape]);
                ctx.deleteShapes([targetShape.id], patch);
                ctx.multiSelectShapes(Object.keys(patch));
                return ctx.states.newSelectionHubState;
              }
              default:
                return;
            }
          }
        }
      },
    };
  },
  (ctx, target) => {
    return newAlignBoxHandler({
      getShapeComposite: ctx.getShapeComposite,
      alignBoxId: target.id,
    });
  },
);
