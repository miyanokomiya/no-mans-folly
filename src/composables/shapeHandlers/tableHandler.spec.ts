import { describe, test, expect } from "vitest";
import {
  generateTableMeta,
  getPatchByDeleteLines,
  getPatchInfoByAddColumns,
  getPatchInfoByAddRows,
} from "./tableHandler";
import { generateTable } from "../../shapes/table/table";
import { generateNKeysBetweenAllowSame } from "../../utils/findex";
import { newShapeComposite } from "../shapeComposite";
import { createShape, getCommonStruct } from "../../shapes";

describe("getPatchInfoByAddRows", () => {
  test("should return patch by adding rows", () => {
    const table = generateTable(3, 3, { width: 20, height: 10 });
    const shapeComposite = newShapeComposite({
      shapes: [table],
      getStruct: getCommonStruct,
    });

    const result0 = getPatchInfoByAddRows(shapeComposite, table, 0, [table.r_0!, table.r_1!]);
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

    const result01 = getPatchInfoByAddRows(shapeComposite, table, -1, [table.r_0!, table.r_1!]);
    expect(result01).toEqual(result0);

    const result1 = getPatchInfoByAddRows(shapeComposite, table, 1, [table.r_0!, table.r_1!]);
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

    const result2 = getPatchInfoByAddRows(shapeComposite, table, 3, [table.r_0!, table.r_1!]);
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

    const result21 = getPatchInfoByAddRows(shapeComposite, table, 4, [table.r_0!, table.r_1!]);
    expect(result21).toEqual(result2);
  });
});

describe("getPatchInfoByAddColumns", () => {
  test("should return patch by adding columns", () => {
    const table = generateTable(3, 3, { width: 20, height: 10 });
    const shapeComposite = newShapeComposite({
      shapes: [table],
      getStruct: getCommonStruct,
    });

    const result0 = getPatchInfoByAddColumns(shapeComposite, table, 0, [table.c_0!, table.c_1!]);
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

describe("getPatchByDeleteLines", () => {
  test("should return patch info to delete table lines", () => {
    const table = generateTable(3, 3, { width: 20, height: 10 });
    const shape00 = createShape(getCommonStruct, "rectangle", {
      id: "shape00",
      parentId: table.id,
      parentMeta: generateTableMeta(["r_0", "c_0"]),
    });
    const shape01 = {
      ...shape00,
      id: "shape01",
      parentMeta: generateTableMeta(["r_0", "c_1"]),
    };
    const shape10 = {
      ...shape00,
      id: "shape10",
      parentMeta: generateTableMeta(["r_1", "c_0"]),
    };
    const shapeComposite = newShapeComposite({
      shapes: [table, shape00, shape01, shape10],
      getStruct: getCommonStruct,
    });

    const result0 = getPatchByDeleteLines(shapeComposite, table, ["r_0"]);
    expect(result0.patch).toHaveProperty("r_0");
    expect(result0).toEqual({
      patch: { r_0: undefined },
      delete: [shape00.id, shape01.id],
    });

    const result1 = getPatchByDeleteLines(shapeComposite, table, ["c_0"]);
    expect(result1.patch).toHaveProperty("c_0");
    expect(result1).toEqual({
      patch: { c_0: undefined },
      delete: [shape00.id, shape10.id],
    });
  });
});
