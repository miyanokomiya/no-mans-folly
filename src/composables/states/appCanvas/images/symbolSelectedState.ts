import { SymbolShape } from "../../../../shapes/symbol";
import { newSymbolHandler, SymbolHandler } from "../../../shapeHandlers/symbolHandler";
import {
  CONTEXT_MENU_ITEM_SRC,
  createSymbolAsset,
  getMenuItemsForSelectedShapes,
  updateSymbolAssetIdBySrc,
} from "../contextMenuItems";
import { AppCanvasStateContext } from "../core";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";

export const newSymbolSelectedState = defineSingleSelectedHandlerState<SymbolShape, SymbolHandler, never>(
  (getters) => {
    async function updateSymbolAsset(ctx: AppCanvasStateContext) {
      // Duplicated symbol shapes refer to the original asset files
      // => Update their "assetId" if it contradicts with their "src".
      const shape = getters.getTargetShape();
      await createSymbolAsset(ctx, shape.src);
      await updateSymbolAssetIdBySrc(ctx, shape.src);
    }

    return {
      getLabel: () => "SymbolSelected",
      handleEvent: (ctx, event) => {
        switch (event.type) {
          case "pointerdown": {
            switch (event.data.options.button) {
              case 0: {
                const targetShape = getters.getTargetShape();
                const shapeHandler = getters.getShapeHandler();

                const hitResult = shapeHandler.hitTest(event.data.point, ctx.getScale());
                shapeHandler.saveHitResult(hitResult);
                if (!hitResult) return;

                switch (hitResult.type) {
                  case "open": {
                    const ids = targetShape.src;
                    ctx.multiSelectShapes(ids);
                    return () => ctx.states.newPanToShapeState({ ids, duration: 150 });
                  }
                  case "reload": {
                    updateSymbolAsset(ctx);
                    return ctx.states.newSelectionHubState;
                  }
                }
              }
            }
            return;
          }
          case "contextmenu": {
            ctx.setContextMenuList({
              items: [
                CONTEXT_MENU_ITEM_SRC.UPDATE_SYMBOL,
                CONTEXT_MENU_ITEM_SRC.SEPARATOR,
                ...getMenuItemsForSelectedShapes(ctx),
              ],
              point: event.data.point,
            });
            return null;
          }
          case "contextmenu-item": {
            switch (event.data.key) {
              case CONTEXT_MENU_ITEM_SRC.UPDATE_SYMBOL.key: {
                updateSymbolAsset(ctx);
                return ctx.states.newSelectionHubState;
              }
            }
            return;
          }
        }
      },
    };
  },
  (ctx, target) =>
    newSymbolHandler({
      getShapeComposite: ctx.getShapeComposite,
      targetId: target.id,
    }),
);
