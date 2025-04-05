import { SheetImageShape } from "../../../../shapes/sheetImage";
import { getSheetIdFromThumbnailFileName } from "../../../../utils/fileAccess";
import { newSheetImageHandler, SheetImageHandler } from "../../../shapeHandlers/shapeImageHandler";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";

export const newSheetImageSelectedState = defineSingleSelectedHandlerState<SheetImageShape, SheetImageHandler, never>(
  (getters) => {
    return {
      getLabel: () => "SheetImageSelected",
      handleEvent: (ctx, event) => {
        switch (event.type) {
          case "pointerdown":
            switch (event.data.options.button) {
              case 0: {
                const targetShape = getters.getTargetShape();
                const shapeHandler = getters.getShapeHandler();

                const hitResult = shapeHandler.hitTest(event.data.point, ctx.getScale());
                shapeHandler.saveHitResult(hitResult);
                if (!hitResult) return;

                switch (hitResult.type) {
                  case "open": {
                    if (!targetShape.assetId) return;
                    const sheetId = getSheetIdFromThumbnailFileName(targetShape.assetId);
                    if (sheetId) {
                      ctx.selectSheet(sheetId);
                    }
                    break;
                  }
                }
              }
            }
        }
      },
    };
  },
  (ctx, target) =>
    newSheetImageHandler({
      getShapeComposite: ctx.getShapeComposite,
      targetId: target.id,
      sheets: ctx.getSheets(),
      selectedSheetId: ctx.getSelectedSheet()?.id,
    }),
);
