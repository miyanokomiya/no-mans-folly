import { TableShape } from "../../../../shapes/table/table";
import { newBoundingBox } from "../../../boundingBox";
import { newResizeColumn, newResizeRow, newTableHandler, TableHandler } from "../../../shapeHandlers/tableHandler";
import { newResizingState } from "../resizingState";
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
                  case "border-row": {
                    const resizeRow = newResizeRow(targetShape, hitResult.coord);
                    if (!resizeRow) return;

                    const boundingBox = newBoundingBox({
                      path: resizeRow.linePath,
                    });
                    return () =>
                      newResizingState({
                        boundingBox,
                        hitResult: { type: "segment", index: hitResult.coord === 0 ? 0 : 2 },
                        resizeFn: (_, affine) => {
                          return { [targetShape.id]: resizeRow.resizeFn(affine) };
                        },
                      });
                  }
                  case "border-column": {
                    const resizeColumn = newResizeColumn(targetShape, hitResult.coord);
                    if (!resizeColumn) return;

                    const boundingBox = newBoundingBox({
                      path: resizeColumn.linePath,
                    });
                    return () =>
                      newResizingState({
                        boundingBox,
                        hitResult: { type: "segment", index: hitResult.coord === 0 ? 3 : 1 },
                        resizeFn: (_, affine) => {
                          return { [targetShape.id]: resizeColumn.resizeFn(affine) };
                        },
                      });
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
