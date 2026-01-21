import { TableShape } from "../../../../shapes/table/table";
import { newTableHandler, TableHandler } from "../../../shapeHandlers/tableHandler";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";

export const newTableSelectedState = defineSingleSelectedHandlerState<TableShape, TableHandler, never>(
  (getters) => {
    return {
      getLabel: () => "TableSelected",
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
                  case "border-row":
                  case "border-column": {
                    return;
                  }
                }
              }
            }
            return;
          }
        }
      },
    };
  },
  (ctx, target) =>
    newTableHandler({
      getShapeComposite: ctx.getShapeComposite,
      targetId: target.id,
    }),
);
