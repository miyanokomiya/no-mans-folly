import {
  getTableCoordsLocations,
  getTableShapeInfo,
  getTableSizeByInfo,
  TableShape,
} from "../../../../shapes/table/table";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { applyLocalSpace, scaleGlobalAlpha } from "../../../../utils/renderer";
import { newBoundingBox } from "../../../boundingBox";
import {
  getPatchByDeleteLines,
  getPatchInfoByInsertColumn,
  getPatchInfoByInsertRow,
  newResizeColumn,
  newResizeRow,
  newTableHandler,
  TableHandler,
} from "../../../shapeHandlers/tableHandler";
import { newTableSelectable, TableSelectable } from "../../../tableSelectable";
import { ContextMenuItem } from "../../types";
import { CONTEXT_MENU_ITEM_SRC } from "../contextMenuItems";
import { newResizingState } from "../resizingState";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";

export const newTableSelectedState = defineSingleSelectedHandlerState<TableShape, TableHandler, never>(
  (getters) => {
    let tableSelectable: TableSelectable;

    return {
      getLabel: () => "TableSelected",
      onStart: () => {
        const targetShape = getters.getTargetShape();
        tableSelectable = newTableSelectable({ table: targetShape });
      },
      handleEvent: (ctx, event) => {
        const targetShape = getters.getTargetShape();
        const shapeHandler = getters.getShapeHandler();

        switch (event.type) {
          case "pointerdown": {
            switch (event.data.options.button) {
              case 0: {
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
                  case "add-row": {
                    const patch = getPatchInfoByInsertRow(targetShape, hitResult.coord, ctx.generateUuid);
                    ctx.updateShapes({ update: { [targetShape.id]: patch } });
                    return ctx.states.newSelectionHubState;
                  }
                  case "add-column": {
                    const patch = getPatchInfoByInsertColumn(targetShape, hitResult.coord, ctx.generateUuid);
                    ctx.updateShapes({ update: { [targetShape.id]: patch } });
                    return ctx.states.newSelectionHubState;
                  }
                  case "head-row": {
                    const tableInfo = getTableShapeInfo(targetShape);
                    const row = tableInfo?.rows[hitResult.coord];
                    if (row) {
                      tableSelectable.selectRow(row.id, event.data.options.ctrl);
                      ctx.redraw();
                    }
                    return null;
                  }
                  case "head-column": {
                    const tableInfo = getTableShapeInfo(targetShape);
                    const column = tableInfo?.columns[hitResult.coord];
                    if (column) {
                      tableSelectable.selectColumn(column.id, event.data.options.ctrl);
                      ctx.redraw();
                    }
                    return null;
                  }
                  default: {
                    return;
                  }
                }
              }
              case 2: {
                const hitResult = shapeHandler.hitTest(event.data.point, ctx.getScale());
                shapeHandler.saveHitResult(hitResult);
                if (!hitResult) return;

                switch (hitResult.type) {
                  case "head-row": {
                    const tableInfo = getTableShapeInfo(targetShape);
                    const row = tableInfo?.rows[hitResult.coord];
                    if (row) {
                      tableSelectable.selectRow(row.id, event.data.options.ctrl);
                      ctx.redraw();
                    }
                    return null;
                  }
                  case "head-column": {
                    const tableInfo = getTableShapeInfo(targetShape);
                    const column = tableInfo?.columns[hitResult.coord];
                    if (column) {
                      tableSelectable.selectColumn(column.id, event.data.options.ctrl);
                      ctx.redraw();
                    }
                    return null;
                  }
                  default: {
                    return;
                  }
                }
              }
            }
            return;
          }
          case "contextmenu": {
            const hitResult = shapeHandler.retrieveHitResult();
            if (!hitResult) return;

            const items: ContextMenuItem[] = [];
            switch (hitResult.type) {
              case "head-row": {
                items.push(CONTEXT_MENU_ITEM_SRC.DELETE_TABLE_ROW);
                break;
              }
              case "head-column": {
                items.push(CONTEXT_MENU_ITEM_SRC.DELETE_TABLE_COLUMN);
                break;
              }
            }

            ctx.setContextMenuList({
              items,
              point: event.data.point,
            });
            return null;
          }
          case "contextmenu-item": {
            const shapeComposite = ctx.getShapeComposite();

            switch (event.data.key) {
              case CONTEXT_MENU_ITEM_SRC.DELETE_TABLE_ROW.key: {
                const rows = tableSelectable.getSelectedRows();
                const info = getPatchByDeleteLines(shapeComposite, targetShape, rows);
                ctx.updateShapes({
                  update: { [targetShape.id]: info.patch },
                  delete: info.delete,
                });
                return ctx.states.newSelectionHubState;
              }
              case CONTEXT_MENU_ITEM_SRC.DELETE_TABLE_COLUMN.key: {
                const columns = tableSelectable.getSelectedColumns();
                const info = getPatchByDeleteLines(shapeComposite, targetShape, columns);
                ctx.updateShapes({
                  update: { [targetShape.id]: info.patch },
                  delete: info.delete,
                });
                return ctx.states.newSelectionHubState;
              }
            }
          }
        }
      },
      render: (ctx, renderCtx) => {
        const selectedCoords = tableSelectable.getSelectedCoords();
        if (selectedCoords.length === 0) return;

        const targetShape = getters.getTargetShape();
        const tableInfo = getTableShapeInfo(targetShape);
        if (!tableInfo) return;

        const style = ctx.getStyleScheme();
        const coordsLocations = getTableCoordsLocations(tableInfo);
        const size = getTableSizeByInfo(tableInfo);
        const shapeRect = { x: targetShape.p.x, y: targetShape.p.y, width: size.width, height: size.height };
        const rowIndexMap = new Map<string, number>(tableInfo.rows.map((row, r) => [row.id, r]));
        const columnIndexMap = new Map<string, number>(tableInfo.columns.map((column, c) => [column.id, c]));
        applyLocalSpace(renderCtx, shapeRect, targetShape.rotation, () => {
          scaleGlobalAlpha(renderCtx, 0.2, () => {
            applyFillStyle(renderCtx, { color: style.selectionPrimary });
            renderCtx.beginPath();
            selectedCoords.forEach((coord) => {
              const r = rowIndexMap.get(coord[0]);
              const c = columnIndexMap.get(coord[1]);
              if (r === undefined || c === undefined) return;

              const top = coordsLocations.rows[r];
              const bottom = coordsLocations.rows[r + 1];
              const left = coordsLocations.columns[c];
              const right = coordsLocations.columns[c + 1];
              renderCtx.rect(left, top, right - left, bottom - top);
            });
            renderCtx.fill();
          });
        });
      },
    };
  },
  (ctx, target) =>
    newTableHandler({
      getShapeComposite: ctx.getShapeComposite,
      targetId: target.id,
    }),
);
