import * as okaselect from "okaselect";
import { getTableShapeInfo, TableShape } from "../shapes/table/table";
import { TableCoords } from "../utils/layouts/table";
import { generateTableMeta } from "./shapeHandlers/tableHandler";
import { mapEach } from "../utils/commons";

type TableSelectableOption = {
  table: TableShape;
};

export function newTableSelectable(option: TableSelectableOption) {
  const tableInfo = getTableShapeInfo(option.table);
  const items: Record<string, TableCoords> = {};
  if (tableInfo) {
    tableInfo.rows.forEach((r) => {
      tableInfo.columns.forEach((c) => {
        const coords: TableCoords = [r.id, c.id];
        items[generateTableMeta(coords)] = coords;
      });
    });
  }
  const selectable = okaselect.useItemSelectable(() => items);

  function selectCell(row: string, column: string, ctrl = false) {
    selectable.select(generateTableMeta([row, column]), ctrl);
  }

  function selectRow(coord: string, ctrl = false) {
    const list: string[] = [];
    mapEach(items, ([row], key) => {
      if (row === coord) {
        list.push(key);
      }
    });
    selectable.multiSelect(list, ctrl);
  }

  function selectColumn(coord: string, ctrl = false) {
    const list: string[] = [];
    mapEach(items, ([, column], key) => {
      if (column === coord) {
        list.push(key);
      }
    });
    selectable.multiSelect(list, ctrl);
  }

  function getSelectedCoords() {
    return selectable.getSelectedItemList();
  }

  function getSelectedRows(): string[] {
    if (!tableInfo) return [];

    const selected = selectable.getSelected();
    return (
      tableInfo.rows
        .filter((r) => tableInfo.columns.every((c) => selected[generateTableMeta([r.id, c.id])]))
        .map((r) => r.id) ?? []
    );
  }

  function getSelectedColumns(): string[] {
    if (!tableInfo) return [];

    const selected = selectable.getSelected();
    return (
      tableInfo.columns
        .filter((c) => tableInfo.rows.every((r) => selected[generateTableMeta([r.id, c.id])]))
        .map((c) => c.id) ?? []
    );
  }

  return {
    clearAll: selectable.clearAll,
    getSelectedCoords,
    getSelectedRows,
    getSelectedColumns,
    selectCell,
    selectRow,
    selectColumn,
  };
}
