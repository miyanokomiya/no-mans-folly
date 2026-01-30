import * as okaselect from "okaselect";
import { getTableShapeInfo, TableCoords, TableShape } from "../shapes/table/table";
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

  function selectCell(row: string, column: string, ctrl = false, shift = false) {
    const key = generateTableMeta([row, column] as TableCoords);
    if (shift) {
      if (ctrl) {
        selectable.clearForce([key]);
      } else {
        selectable.selectForce([key]);
      }
    } else {
      selectable.select(key, ctrl);
    }
  }

  function selectRow(coord: string, ctrl = false, shift = false) {
    const list: string[] = [];
    mapEach(items, ([row], key) => {
      if (row === coord) {
        list.push(key);
      }
    });

    if (shift) {
      if (ctrl) {
        selectable.clearForce(list);
      } else {
        selectable.selectForce(list);
      }
    } else {
      selectable.multiSelect(list, ctrl);
    }
  }

  function selectColumn(coord: string, ctrl = false, shift = false) {
    const list: string[] = [];
    mapEach(items, ([, column], key) => {
      if (column === coord) {
        list.push(key);
      }
    });

    if (shift) {
      if (ctrl) {
        selectable.clearForce(list);
      } else {
        selectable.selectForce(list);
      }
    } else {
      selectable.multiSelect(list, ctrl);
    }
  }

  function isSelectedCell(coords: TableCoords): boolean {
    return getSelectedCoords().some((val) => val[0] === coords[0] && val[1] === coords[1]);
  }

  function getAllCoords(): TableCoords[] {
    return Object.values(items);
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
    isSelectedCell,
    getAllCoords,
    getSelectedCoords,
    getSelectedRows,
    getSelectedColumns,
    selectCell,
    selectRow,
    selectColumn,
  };
}
export type TableSelectable = ReturnType<typeof newTableSelectable>;
