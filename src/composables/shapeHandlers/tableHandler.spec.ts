import { describe, test, expect } from "vitest";
import { getPatchInfoByAddColumns, getPatchInfoByAddRows } from "./tableHandler";
import { createShape, getCommonStruct } from "../../shapes";
import { TableShape } from "../../shapes/table/table";
import { generateNKeysBetweenAllowSame } from "../../utils/findex";
import { toMap } from "../../utils/commons";

function getTable(row: number, column: number) {
  const rowFindexList = generateNKeysBetweenAllowSame(undefined, undefined, row);
  const columnFindexList = generateNKeysBetweenAllowSame(undefined, undefined, column);
  return createShape<TableShape>(getCommonStruct, "table", {
    id: "table3x3",
    ...toMap(rowFindexList.map((findex, i) => ({ id: `r_${i}`, findex, size: 10 }))),
    ...toMap(columnFindexList.map((findex, i) => ({ id: `c_${i}`, findex, size: 20 }))),
  });
}

describe("getPatchInfoByAddRows", () => {
  test("should return patch by adding rows", () => {
    const table = getTable(3, 3);

    const result0 = getPatchInfoByAddRows(table, 0, [table.r_0!, table.r_1!]);
    const findexList0 = generateNKeysBetweenAllowSame(undefined, table.r_0?.findex, 2);
    expect(result0).toEqual({
      r_0: {
        findex: findexList0[0],
        id: "r_0",
        size: 10,
      },
      r_1: {
        findex: findexList0[1],
        id: "r_1",
        size: 10,
      },
    });

    const result01 = getPatchInfoByAddRows(table, -1, [table.r_0!, table.r_1!]);
    expect(result01).toEqual(result0);

    const result1 = getPatchInfoByAddRows(table, 1, [table.r_0!, table.r_1!]);
    const findexList1 = generateNKeysBetweenAllowSame(table.r_0?.findex, table.r_1?.findex, 2);
    expect(result1).toEqual({
      r_0: {
        findex: findexList1[0],
        id: "r_0",
        size: 10,
      },
      r_1: {
        findex: findexList1[1],
        id: "r_1",
        size: 10,
      },
    });

    const result2 = getPatchInfoByAddRows(table, 3, [table.r_0!, table.r_1!]);
    const findexList2 = generateNKeysBetweenAllowSame(table.r_2?.findex, undefined, 2);
    expect(result2).toEqual({
      r_0: {
        findex: findexList2[0],
        id: "r_0",
        size: 10,
      },
      r_1: {
        findex: findexList2[1],
        id: "r_1",
        size: 10,
      },
    });

    const result21 = getPatchInfoByAddRows(table, 4, [table.r_0!, table.r_1!]);
    expect(result21).toEqual(result2);
  });
});

describe("getPatchInfoByAddColumns", () => {
  test("should return patch by adding columns", () => {
    const table = getTable(3, 3);

    const result0 = getPatchInfoByAddColumns(table, 0, [table.c_0!, table.c_1!]);
    const findexList0 = generateNKeysBetweenAllowSame(undefined, table.c_0?.findex, 2);
    expect(result0).toEqual({
      c_0: {
        findex: findexList0[0],
        id: "c_0",
        size: 20,
      },
      c_1: {
        findex: findexList0[1],
        id: "c_1",
        size: 20,
      },
    });
  });
});
