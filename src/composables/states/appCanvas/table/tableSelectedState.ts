import { IVec2 } from "okageo";
import { createShape } from "../../../../shapes";
import { RectangleShape } from "../../../../shapes/rectangle";
import {
  getCoordsBoundsInfo,
  getTableShapeInfo,
  getTableSizeByInfo,
  TableColumnKey,
  TableRowKey,
  TableShape,
} from "../../../../shapes/table/table";
import { applyFillStyle, createFillStyle } from "../../../../utils/fillStyle";
import { applyLocalSpace } from "../../../../utils/renderer";
import { createStrokeStyle } from "../../../../utils/strokeStyle";
import { newBoundingBox } from "../../../boundingBox";
import {
  generateTableMeta,
  getPatchByClearCellStyle,
  getPatchByDeleteLines,
  getPatchByFitLines,
  getPatchByMergeCells,
  getPatchByUnfitLines,
  getPatchByUnmergeCells,
  getPatchInfoByInsertColumn,
  getPatchInfoByInsertRow,
  newResizeColumn,
  newResizeRow,
  newTableHandler,
  renderHighlightCellBorders,
  renderHighlightCells,
  TableHandler,
} from "../../../shapeHandlers/tableHandler";
import { newTableSelectable, TableSelectable } from "../../../tableSelectable";
import { CONTEXT_MENU_ITEM_SRC, getMenuItemsForSelectedShapes } from "../contextMenuItems";
import { newResizingState } from "../resizingState";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { AppCanvasStateContext } from "../core";
import { newMovingTableLineState } from "./movingTableLineState";
import { ContextMenuItem } from "../../types";
import { getCommonCommandExams } from "../commons";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { getPatchInfoByDuplicateColumns, getPatchInfoByDuplicateRows } from "../../../shapeHandlers/tableDuplicator";

interface Option {
  tableSelectable?: TableSelectable;
}

export const newTableSelectedState = defineSingleSelectedHandlerState<TableShape, TableHandler, [Option | undefined]>(
  (getters, option) => {
    let tableSelectable: TableSelectable;
    if (option?.tableSelectable) tableSelectable = option.tableSelectable;

    function isOnTable(ctx: AppCanvasStateContext, p: IVec2) {
      const targetShape = getters.getTargetShape();
      const shapeComposite = ctx.getShapeComposite();
      const shapeAtPoint = shapeComposite.findShapeAt(
        p,
        shapeComposite.getSelectionScope(targetShape),
        undefined,
        undefined,
        ctx.getScale(),
      );
      return shapeAtPoint?.id === targetShape.id;
    }

    function handleFloatMenuForCell(ctx: AppCanvasStateContext) {
      if (tableSelectable.getSelectedCoords().length > 0) {
        const targetShape = getters.getTargetShape();
        ctx.showFloatMenu({
          type: "table-cell",
          data: {
            tableId: targetShape.id,
            selectedCoords: tableSelectable.getSelectedCoords(),
          },
        });
      } else {
        ctx.showFloatMenu();
      }
    }

    return {
      getLabel: () => "TableSelected",
      onStart: (ctx) => {
        ctx.setCommandExams([COMMAND_EXAM_SRC.TABLE_SHIFT_SELECT, ...getCommonCommandExams(ctx)]);

        const targetShape = getters.getTargetShape();
        tableSelectable = newTableSelectable({ table: targetShape });
      },
      onResume: (ctx) => {
        getters.refresh(ctx);
        handleFloatMenuForCell(ctx);
      },
      handleEvent: (ctx, event) => {
        const targetShape = getters.getTargetShape();
        const shapeHandler = getters.getShapeHandler();
        const shapeComposite = ctx.getShapeComposite();

        switch (event.type) {
          case "pointerdown": {
            switch (event.data.options.button) {
              case 0: {
                const hitResult = shapeHandler.hitTest(event.data.point, ctx.getScale());
                shapeHandler.saveHitResult(hitResult);
                if (!hitResult) return;

                ctx.setContextMenuList();
                switch (hitResult.type) {
                  case "border-row": {
                    const resizeRow = newResizeRow(targetShape, hitResult.coord, hitResult.opposite);
                    if (!resizeRow) return;

                    const boundingBox = newBoundingBox({
                      path: resizeRow.linePath,
                    });
                    return () =>
                      newResizingState({
                        boundingBox,
                        hitResult: { type: "segment", index: hitResult.opposite ? 0 : 2 },
                        resizeFn: (_, affine) => {
                          return { [targetShape.id]: resizeRow.resizeFn(affine) };
                        },
                      });
                  }
                  case "border-column": {
                    const resizeColumn = newResizeColumn(targetShape, hitResult.coord, hitResult.opposite);
                    if (!resizeColumn) return;

                    const boundingBox = newBoundingBox({
                      path: resizeColumn.linePath,
                    });
                    return () =>
                      newResizingState({
                        boundingBox,
                        hitResult: { type: "segment", index: hitResult.opposite ? 3 : 1 },
                        resizeFn: (_, affine) => {
                          return { [targetShape.id]: resizeColumn.resizeFn(affine) };
                        },
                      });
                  }
                  case "add-row": {
                    const patch = getPatchInfoByInsertRow(
                      shapeComposite,
                      targetShape,
                      hitResult.coord,
                      ctx.generateUuid,
                    );
                    ctx.updateShapes({ update: { [targetShape.id]: patch } });
                    return ctx.states.newSelectionHubState;
                  }
                  case "add-column": {
                    const patch = getPatchInfoByInsertColumn(
                      shapeComposite,
                      targetShape,
                      hitResult.coord,
                      ctx.generateUuid,
                    );
                    ctx.updateShapes({ update: { [targetShape.id]: patch } });
                    return ctx.states.newSelectionHubState;
                  }
                  case "head-row": {
                    const tableInfo = getTableShapeInfo(targetShape);
                    const row = tableInfo?.rows[hitResult.coord];
                    if (!row) return;

                    if (event.data.options.ctrl) {
                      tableSelectable.selectRow(row.id, event.data.options.ctrl);
                      handleFloatMenuForCell(ctx);
                      ctx.redraw();
                      return null;
                    }

                    if (!tableSelectable.getSelectedRows().includes(row.id)) {
                      tableSelectable.selectRow(row.id);
                    }

                    return {
                      type: "stack-resume",
                      getState: () =>
                        newMovingTableLineState({
                          tableId: targetShape.id,
                          type: "row",
                          targetLines: tableSelectable.getSelectedRows(),
                          indexLine: row.id,
                          tableHandler: shapeHandler,
                          tableSelectable,
                        }),
                    };
                  }
                  case "head-column": {
                    const tableInfo = getTableShapeInfo(targetShape);
                    const column = tableInfo?.columns[hitResult.coord];
                    if (!column) return;

                    if (event.data.options.ctrl) {
                      tableSelectable.selectColumn(column.id, event.data.options.ctrl);
                      handleFloatMenuForCell(ctx);
                      ctx.redraw();
                      return null;
                    }

                    if (!tableSelectable.getSelectedColumns().includes(column.id)) {
                      tableSelectable.selectColumn(column.id);
                    }

                    return {
                      type: "stack-resume",
                      getState: () =>
                        newMovingTableLineState({
                          tableId: targetShape.id,
                          type: "column",
                          targetLines: tableSelectable.getSelectedColumns(),
                          indexLine: column.id,
                          tableHandler: shapeHandler,
                          tableSelectable,
                        }),
                    };
                  }
                  case "area-cell": {
                    if (!hitResult.marker) return;

                    const tableInfo = getTableShapeInfo(targetShape);
                    const row = tableInfo?.rows[hitResult.coords[0]];
                    const column = tableInfo?.columns[hitResult.coords[1]];
                    if (!row || !column) return;

                    tableSelectable.selectCell(row.id, column.id, event.data.options.ctrl);
                    handleFloatMenuForCell(ctx);
                    ctx.redraw();
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
                    if (row && !tableSelectable.getSelectedRows().includes(row.id)) {
                      tableSelectable.selectRow(row.id, event.data.options.ctrl);
                      handleFloatMenuForCell(ctx);
                      ctx.redraw();
                    }
                    return null;
                  }
                  case "head-column": {
                    const tableInfo = getTableShapeInfo(targetShape);
                    const column = tableInfo?.columns[hitResult.coord];
                    if (column && !tableSelectable.getSelectedColumns().includes(column.id)) {
                      tableSelectable.selectColumn(column.id, event.data.options.ctrl);
                      handleFloatMenuForCell(ctx);
                      ctx.redraw();
                    }
                    return null;
                  }
                  case "area-cell": {
                    if (!hitResult.marker) return;

                    const tableInfo = getTableShapeInfo(targetShape);
                    const row = tableInfo?.rows[hitResult.coords[0]];
                    const column = tableInfo?.columns[hitResult.coords[1]];
                    if (row && column && !tableSelectable.isSelectedCell([row.id, column.id])) {
                      tableSelectable.selectCell(row.id, column.id, event.data.options.ctrl);
                      handleFloatMenuForCell(ctx);
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
          case "pointerdoubleclick": {
            const hitResult = shapeHandler.hitTest(event.data.point, ctx.getScale());
            if (hitResult?.type !== "area-cell" || !isOnTable(ctx, event.data.point)) return;

            const tableInfo = getTableShapeInfo(targetShape);
            const row = tableInfo?.rows[hitResult.coords[0]];
            const column = tableInfo?.columns[hitResult.coords[1]];
            if (!row || !column) return;

            const parentMeta = generateTableMeta([row.id, column.id]);
            const sibling = shapeComposite.shapes.find(
              (s) => s.parentId === targetShape.id && s.parentMeta === parentMeta,
            );
            if (sibling) return;

            const rectShape = createShape<RectangleShape>(ctx.getShapeStruct, "rectangle", {
              id: ctx.generateUuid(),
              findex: ctx.createLastIndex(),
              parentId: targetShape.id,
              parentMeta,
              width: column.size,
              height: row.size,
              lcH: 1,
              lcV: 1,
              fill: createFillStyle({ disabled: true }),
              stroke: createStrokeStyle({ disabled: true }),
            });
            ctx.updateShapes({ add: [rectShape] });
            return () => ctx.states.newTextEditingState({ id: rectShape.id });
          }
          case "pointerhover": {
            const hitResult = shapeHandler.retrieveHitResult();
            if (event.data.shift && hitResult) {
              switch (hitResult.type) {
                case "head-row": {
                  const tableInfo = getTableShapeInfo(targetShape);
                  const row = tableInfo?.rows[hitResult.coord];
                  if (row) {
                    tableSelectable.selectRow(row.id, event.data.ctrl, true);
                    handleFloatMenuForCell(ctx);
                    ctx.redraw();
                  }
                  return;
                }
                case "head-column": {
                  const tableInfo = getTableShapeInfo(targetShape);
                  const column = tableInfo?.columns[hitResult.coord];
                  if (column) {
                    tableSelectable.selectColumn(column.id, event.data.ctrl, true);
                    handleFloatMenuForCell(ctx);
                    ctx.redraw();
                  }
                  return;
                }
                case "area-cell": {
                  const tableInfo = getTableShapeInfo(targetShape);
                  const row = tableInfo?.rows[hitResult.coords[0]];
                  const column = tableInfo?.columns[hitResult.coords[1]];
                  if (row && column) {
                    tableSelectable.selectCell(row.id, column.id, event.data.ctrl, true);
                    handleFloatMenuForCell(ctx);
                    ctx.redraw();
                  }
                  return;
                }
              }
            }
            return;
          }
          case "contextmenu": {
            const hitResult = shapeHandler.retrieveHitResult();
            if (!hitResult) return;

            switch (hitResult.type) {
              case "head-row": {
                const tableInfo = getTableShapeInfo(targetShape);
                const row = tableInfo?.rows[hitResult.coord];
                if (row) {
                  ctx.setContextMenuList({
                    items: [
                      ...(row.fit
                        ? [CONTEXT_MENU_ITEM_SRC.TABLE_ROW_UNFIT_CONTENT]
                        : [CONTEXT_MENU_ITEM_SRC.TABLE_ROW_FIT_CONTENT]),
                      CONTEXT_MENU_ITEM_SRC.DUPLICATE_TABLE_ROW,
                      CONTEXT_MENU_ITEM_SRC.CLEAR_TABLE_CELLS_STYLES,
                      CONTEXT_MENU_ITEM_SRC.SEPARATOR,
                      CONTEXT_MENU_ITEM_SRC.DELETE_TABLE_ROW,
                    ],
                    point: event.data.point,
                  });
                }
                return null;
              }
              case "head-column": {
                const tableInfo = getTableShapeInfo(targetShape);
                const column = tableInfo?.columns[hitResult.coord];
                if (column) {
                  ctx.setContextMenuList({
                    items: [
                      ...(column.fit
                        ? [CONTEXT_MENU_ITEM_SRC.TABLE_COLUMN_UNFIT_CONTENT]
                        : [CONTEXT_MENU_ITEM_SRC.TABLE_COLUMN_FIT_CONTENT]),
                      CONTEXT_MENU_ITEM_SRC.DUPLICATE_TABLE_COLUMN,
                      CONTEXT_MENU_ITEM_SRC.CLEAR_TABLE_CELLS_STYLES,
                      CONTEXT_MENU_ITEM_SRC.SEPARATOR,
                      CONTEXT_MENU_ITEM_SRC.DELETE_TABLE_COLUMN,
                    ],
                    point: event.data.point,
                  });
                }
                return null;
              }
              case "area-cell": {
                const items: ContextMenuItem[] = [];
                if (tableSelectable.getSelectedCoords().length > 1) {
                  items.push(CONTEXT_MENU_ITEM_SRC.MERGE_TABLE_CELLS);
                }

                const tableInfo = getTableShapeInfo(targetShape);
                if (tableInfo) {
                  const coordsList = tableSelectable.getSelectedCoords();
                  const boundsInfo = getCoordsBoundsInfo(tableInfo, coordsList);
                  if (boundsInfo && boundsInfo.touchIds.length > 0) {
                    items.push(CONTEXT_MENU_ITEM_SRC.UNMERGE_TABLE_CELLS);
                  }
                }

                items.push(CONTEXT_MENU_ITEM_SRC.CLEAR_TABLE_CELLS_STYLES);
                ctx.setContextMenuList({
                  items: [...items, CONTEXT_MENU_ITEM_SRC.SEPARATOR, ...getMenuItemsForSelectedShapes(ctx)],
                  point: event.data.point,
                });
                return null;
              }
            }
            return;
          }
          case "contextmenu-item": {
            switch (event.data.key) {
              case CONTEXT_MENU_ITEM_SRC.DUPLICATE_TABLE_ROW.key: {
                const info = getPatchInfoByDuplicateRows(
                  shapeComposite,
                  Object.entries(ctx.getDocumentMap()),
                  ctx.generateUuid,
                  targetShape,
                  tableSelectable.getSelectedRows() as TableRowKey[],
                );
                if (!info) return;

                ctx.updateShapes(info.patch, info.docMap);
                return ctx.states.newSelectionHubState;
              }
              case CONTEXT_MENU_ITEM_SRC.DUPLICATE_TABLE_COLUMN.key: {
                const info = getPatchInfoByDuplicateColumns(
                  shapeComposite,
                  Object.entries(ctx.getDocumentMap()),
                  ctx.generateUuid,
                  targetShape,
                  tableSelectable.getSelectedColumns() as TableColumnKey[],
                );
                if (!info) return;

                ctx.updateShapes(info.patch, info.docMap);
                return ctx.states.newSelectionHubState;
              }
              case CONTEXT_MENU_ITEM_SRC.DELETE_TABLE_ROW.key: {
                const rows = tableSelectable.getSelectedRows();
                const info = getPatchByDeleteLines(shapeComposite, targetShape, rows);
                ctx.updateShapes(info);
                return ctx.states.newSelectionHubState;
              }
              case CONTEXT_MENU_ITEM_SRC.DELETE_TABLE_COLUMN.key: {
                const columns = tableSelectable.getSelectedColumns();
                const info = getPatchByDeleteLines(shapeComposite, targetShape, columns);
                ctx.updateShapes(info);
                return ctx.states.newSelectionHubState;
              }
              case CONTEXT_MENU_ITEM_SRC.TABLE_ROW_FIT_CONTENT.key: {
                const rows = tableSelectable.getSelectedRows();
                ctx.updateShapes({
                  update: { [targetShape.id]: getPatchByFitLines(targetShape, rows) },
                });
                return ctx.states.newSelectionHubState;
              }
              case CONTEXT_MENU_ITEM_SRC.TABLE_ROW_UNFIT_CONTENT.key: {
                const rows = tableSelectable.getSelectedRows();
                ctx.updateShapes({
                  update: { [targetShape.id]: getPatchByUnfitLines(targetShape, rows) },
                });
                return ctx.states.newSelectionHubState;
              }
              case CONTEXT_MENU_ITEM_SRC.TABLE_COLUMN_FIT_CONTENT.key: {
                const columns = tableSelectable.getSelectedColumns();
                ctx.updateShapes({
                  update: { [targetShape.id]: getPatchByFitLines(targetShape, columns) },
                });
                return ctx.states.newSelectionHubState;
              }
              case CONTEXT_MENU_ITEM_SRC.TABLE_COLUMN_UNFIT_CONTENT.key: {
                const columns = tableSelectable.getSelectedColumns();
                ctx.updateShapes({
                  update: { [targetShape.id]: getPatchByUnfitLines(targetShape, columns) },
                });
                return ctx.states.newSelectionHubState;
              }
              case CONTEXT_MENU_ITEM_SRC.MERGE_TABLE_CELLS.key: {
                const coordsList = tableSelectable.getSelectedCoords();
                const patch = getPatchByMergeCells(targetShape, coordsList, ctx.generateUuid);
                ctx.updateShapes({
                  update: { [targetShape.id]: patch },
                });
                return ctx.states.newSelectionHubState;
              }
              case CONTEXT_MENU_ITEM_SRC.UNMERGE_TABLE_CELLS.key: {
                const coordsList = tableSelectable.getSelectedCoords();
                const patch = getPatchByUnmergeCells(targetShape, coordsList);
                ctx.updateShapes({
                  update: { [targetShape.id]: patch },
                });
                return ctx.states.newSelectionHubState;
              }
              case CONTEXT_MENU_ITEM_SRC.CLEAR_TABLE_CELLS_STYLES.key: {
                const tableInfo = getTableShapeInfo(targetShape);
                if (!tableInfo) return;

                const coordsList = tableSelectable.getSelectedCoords();
                const patch = getPatchByClearCellStyle(tableInfo, coordsList);
                ctx.updateShapes({
                  update: { [targetShape.id]: patch },
                });
                return ctx.states.newSelectionHubState;
              }
              default: {
                return;
              }
            }
          }
          case "shape-updated": {
            if (Object.keys(ctx.getSelectedShapeIdMap()).some((id) => event.data.keys.has(id))) {
              const nextTarget = ctx.getShapeComposite().mergedShapeMap[targetShape.id];
              if (!nextTarget) return ctx.states.newSelectionHubState;

              // Reset the state while keeping "tableSelectable"
              getters.refresh(ctx);
              const nextTableSelectable = newTableSelectable({ table: getters.getTargetShape() });
              tableSelectable.getSelectedCoords().forEach((coords) => {
                nextTableSelectable.selectCell(coords[0], coords[1], false, true);
              });
              tableSelectable = nextTableSelectable;
              handleFloatMenuForCell(ctx);
              return null;
            }
            return;
          }
        }
      },
      render: (ctx, renderCtx) => {
        const targetShape = getters.getTargetShape();
        const tableInfo = getTableShapeInfo(targetShape);
        if (!tableInfo) return;

        const style = ctx.getStyleScheme();
        const scale = ctx.getScale();
        const renderFns: (() => void)[] = [
          () => renderHighlightCellBorders(renderCtx, style, scale, tableInfo, tableSelectable.getSelectedCoords()),
        ];
        const shapeHandler = getters.getShapeHandler();
        const hitResult = shapeHandler.retrieveHitResult();
        if (hitResult?.type === "area-cell") {
          if (hitResult.marker) {
            const row = tableInfo.rows[hitResult.coords[0]];
            const column = tableInfo.columns[hitResult.coords[1]];
            if (row && column) {
              renderFns.push(() => renderHighlightCells(renderCtx, style, tableInfo, [[row.id, column.id]]));
            }
          }

          // Show the marker
          const markerRect = hitResult.markerRect;
          renderFns.push(() => {
            if (hitResult.marker) {
              applyFillStyle(renderCtx, { color: style.selectionSecondaly });
            } else {
              applyFillStyle(renderCtx, { color: style.selectionPrimary });
            }
            renderCtx.beginPath();
            renderCtx.rect(markerRect.x, markerRect.y, markerRect.width, markerRect.height);
            renderCtx.fill();
          });
        }

        if (renderFns.length === 0) return;

        const size = getTableSizeByInfo(tableInfo);
        const shapeRect = { x: targetShape.p.x, y: targetShape.p.y, width: size.width, height: size.height };
        applyLocalSpace(renderCtx, shapeRect, targetShape.rotation, () => {
          renderFns.forEach((fn) => fn());
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
