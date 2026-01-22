import { describe, test, expect } from "vitest";
import { newTableSelectable } from "./tableSelectable";
import { generateTable, getTableShapeInfo } from "../shapes/table/table";

describe("newTableSelectable", () => {
  const table = generateTable(3, 3);
  const tableInfo = getTableShapeInfo(table)!;

  test("should select each cell", () => {
    const target = newTableSelectable({ table });
    expect(target.getSelectedCoords()).toEqual([]);
    target.selectCell(tableInfo.rows[0].id, tableInfo.columns[0].id);
    expect(target.getSelectedCoords()).toEqual([[tableInfo.rows[0].id, tableInfo.columns[0].id]]);
    target.selectCell(tableInfo.rows[1].id, tableInfo.columns[0].id);
    expect(target.getSelectedCoords()).toEqual([[tableInfo.rows[1].id, tableInfo.columns[0].id]]);
    target.selectCell(tableInfo.rows[0].id, tableInfo.columns[0].id, true);
    expect(target.getSelectedCoords()).toEqual([
      [tableInfo.rows[1].id, tableInfo.columns[0].id],
      [tableInfo.rows[0].id, tableInfo.columns[0].id],
    ]);
    target.clearAll();
    expect(target.getSelectedCoords()).toEqual([]);
  });

  test("should select each row", () => {
    const target = newTableSelectable({ table });
    expect(target.getSelectedCoords()).toEqual([]);
    target.selectRow(tableInfo.rows[0].id);
    expect(target.getSelectedCoords()).toEqual(tableInfo.columns.map((c) => [tableInfo.rows[0].id, c.id]));
    target.selectRow(tableInfo.rows[1].id);
    expect(target.getSelectedCoords()).toEqual(tableInfo.columns.map((c) => [tableInfo.rows[1].id, c.id]));
    target.selectRow(tableInfo.rows[0].id, true);
    expect(target.getSelectedCoords()).toEqual([
      ...tableInfo.columns.map((c) => [tableInfo.rows[1].id, c.id]),
      ...tableInfo.columns.map((c) => [tableInfo.rows[0].id, c.id]),
    ]);
  });

  test("should select each column", () => {
    const target = newTableSelectable({ table });
    expect(target.getSelectedCoords()).toEqual([]);
    target.selectColumn(tableInfo.columns[0].id);
    expect(target.getSelectedCoords()).toEqual(tableInfo.rows.map((r) => [r.id, tableInfo.columns[0].id]));
    target.selectColumn(tableInfo.columns[1].id);
    expect(target.getSelectedCoords()).toEqual(tableInfo.rows.map((r) => [r.id, tableInfo.columns[1].id]));
    target.selectColumn(tableInfo.columns[0].id, true);
    expect(target.getSelectedCoords()).toEqual([
      ...tableInfo.rows.map((r) => [r.id, tableInfo.columns[1].id]),
      ...tableInfo.rows.map((r) => [r.id, tableInfo.columns[0].id]),
    ]);
  });

  test("getSelectedRows", () => {
    const target = newTableSelectable({ table });
    expect(target.getSelectedRows()).toEqual([]);
    target.selectRow(tableInfo.rows[0].id);
    expect(target.getSelectedRows()).toEqual([tableInfo.rows[0].id]);
    target.selectRow(tableInfo.rows[1].id, true);
    expect(target.getSelectedRows()).toEqual([tableInfo.rows[0].id, tableInfo.rows[1].id]);
    target.selectCell(tableInfo.rows[2].id, tableInfo.columns[0].id, true);
    expect(target.getSelectedRows()).toEqual([tableInfo.rows[0].id, tableInfo.rows[1].id]);
  });

  test("getSelectedColumns", () => {
    const target = newTableSelectable({ table });
    expect(target.getSelectedColumns()).toEqual([]);
    target.selectColumn(tableInfo.columns[0].id);
    expect(target.getSelectedColumns()).toEqual([tableInfo.columns[0].id]);
    target.selectColumn(tableInfo.columns[1].id, true);
    expect(target.getSelectedColumns()).toEqual([tableInfo.columns[0].id, tableInfo.columns[1].id]);
    target.selectCell(tableInfo.rows[0].id, tableInfo.columns[2].id, true);
    expect(target.getSelectedColumns()).toEqual([tableInfo.columns[0].id, tableInfo.columns[1].id]);
  });
});
