import { describe, test, expect } from "vitest";
import {
  generateTableMeta,
  getPatchByApplyCellStyle,
  getPatchByClearCellStyle,
  getPatchByDeleteLines,
  getPatchInfoByAddColumns,
  getPatchInfoByAddRows,
} from "./tableHandler";
import { generateTable, getTableShapeInfo } from "../../shapes/table/table";
import { generateNKeysBetweenAllowSame } from "../../utils/findex";
import { newShapeComposite } from "../shapeComposite";
import { createShape, getCommonStruct } from "../../shapes";
import { createFillStyle } from "../../utils/fillStyle";

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
    expect(result0.update?.[table.id]).toHaveProperty("r_0");
    expect(result0).toEqual({
      update: {
        [table.id]: { r_0: undefined },
      },
      delete: [shape00.id, shape01.id],
    });

    const result1 = getPatchByDeleteLines(shapeComposite, table, ["c_0"]);
    expect(result1.update?.[table.id]).toHaveProperty("c_0");
    expect(result1).toEqual({
      update: {
        [table.id]: { c_0: undefined },
      },
      delete: [shape00.id, shape10.id],
    });
  });

  test("should handle cell merges", () => {
    const table = generateTable(3, 3, { width: 20, height: 10 });
    table.m_0 = { id: "m_0", a: ["r_0", "c_0"], b: ["r_1", "c_1"] };
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
    const shapeComposite = newShapeComposite({
      shapes: [table, shape00, shape01],
      getStruct: getCommonStruct,
    });

    const result0 = getPatchByDeleteLines(shapeComposite, table, ["c_0"]);
    expect(result0).toEqual({
      update: {
        [table.id]: { c_0: undefined, m_0: { id: "m_0", a: ["r_0", "c_1"], b: ["r_1", "c_1"] } },
      },
      delete: [shape00.id, shape01.id],
    });

    const result1 = getPatchByDeleteLines(shapeComposite, table, ["c_1"]);
    expect(result1).toEqual({
      update: {
        [table.id]: { c_0: undefined, m_0: { id: "m_0", a: ["r_0", "c_0"], b: ["r_1", "c_0"] } },
        [shape01.id]: { parentMeta: "r_0:c_0" },
      },
    });
  });

  test("should handle cell styles", () => {
    const table = generateTable(3, 3, { width: 20, height: 10 });
    table.s_0 = { id: "s_0", a: ["r_0", "c_0"], b: ["r_2", "c_1"], fill: createFillStyle() };
    const shapeComposite = newShapeComposite({
      shapes: [table],
      getStruct: getCommonStruct,
    });

    const result0 = getPatchByDeleteLines(shapeComposite, table, ["r_0"]);
    expect(result0).toEqual({
      update: {
        [table.id]: {
          r_0: undefined,
          s_0: { id: "s_0", a: ["r_1", "c_0"], b: ["r_2", "c_1"], fill: createFillStyle() },
        },
      },
    });

    const result1 = getPatchByDeleteLines(shapeComposite, table, ["r_1"]);
    expect(result1).toEqual({
      update: {
        [table.id]: {
          r_1: undefined,
        },
      },
    });

    const result2 = getPatchByDeleteLines(shapeComposite, table, ["r_2"]);
    expect(result2).toEqual({
      update: {
        [table.id]: {
          r_2: undefined,
          s_0: { id: "s_0", a: ["r_0", "c_0"], b: ["r_1", "c_1"], fill: createFillStyle() },
        },
      },
    });

    const result01 = getPatchByDeleteLines(shapeComposite, table, ["r_0", "r_1"]);
    expect(result01).toEqual({
      update: {
        [table.id]: {
          r_2: undefined,
          s_0: { id: "s_0", a: ["r_2", "c_0"], b: ["r_2", "c_1"], fill: createFillStyle() },
        },
      },
    });

    const result12 = getPatchByDeleteLines(shapeComposite, table, ["r_1", "r_2"]);
    expect(result12).toEqual({
      update: {
        [table.id]: {
          r_2: undefined,
          s_0: { id: "s_0", a: ["r_0", "c_0"], b: ["r_0", "c_1"], fill: createFillStyle() },
        },
      },
    });
  });
});

describe("getPatchByApplyCellStyle", () => {
  test("should return patch by apply cell style", () => {
    const table = generateTable(3, 3, { width: 20, height: 10 });
    table.s_0 = { id: "s_0", a: ["r_0", "c_0"], b: ["r_0", "c_1"], fill: createFillStyle({ disabled: false }) };
    let count = 0;
    const generateUuid = () => `id_${count++}`;

    expect(
      getPatchByApplyCellStyle(
        getTableShapeInfo(table)!,
        [["r_0", "c_0"]],
        { fill: createFillStyle({ disabled: false }) },
        generateUuid,
      ),
    ).toEqual({
      s_id_0: {
        a: ["r_0", "c_0"],
        b: ["r_0", "c_0"],
        fill: createFillStyle({ disabled: false }),
        id: "s_id_0",
      },
    });

    count = 0;
    expect(
      getPatchByApplyCellStyle(
        getTableShapeInfo(table)!,
        [
          ["r_0", "c_0"],
          ["r_0", "c_1"],
        ],
        { fill: createFillStyle({ disabled: false }) },
        generateUuid,
      ),
      "Overwrite existing style having the same bounds",
    ).toEqual({
      s_0: {
        a: ["r_0", "c_0"],
        b: ["r_0", "c_1"],
        fill: createFillStyle({ disabled: false }),
        id: "s_0",
      },
    });
  });
});

describe("getPatchByClearCellStyle", () => {
  test("should return patch by clear cell style", () => {
    const table = generateTable(3, 3, { width: 20, height: 10 });
    table.s_0 = { id: "s_0", a: ["r_0", "c_0"], b: ["r_0", "c_1"], fill: createFillStyle({ disabled: false }) };
    table.s_1 = { id: "s_1", a: ["r_1", "c_1"], b: ["r_1", "c_2"], fill: createFillStyle({ disabled: false }) };
    table.s_2 = { id: "s_2", a: ["r_2", "c_1"], b: ["r_2", "c_2"], fill: createFillStyle({ disabled: false }) };
    table.m_0 = { id: "m_0", a: ["r_0", "c_1"], b: ["r_1", "c_1"] };

    const result0 = getPatchByClearCellStyle(getTableShapeInfo(table)!, [["r_0", "c_0"]]);
    expect(result0).toEqual({});
    expect(result0).toHaveProperty("s_0");
    expect(result0).not.toHaveProperty("s_1");
    expect(result0).not.toHaveProperty("s_2");

    const result1 = getPatchByClearCellStyle(getTableShapeInfo(table)!, [["r_0", "c_1"]]);
    expect(result1).toEqual({});
    expect(result1).toHaveProperty("s_0");
    expect(result1).toHaveProperty("s_1");
    expect(result1).not.toHaveProperty("s_2");

    const result2 = getPatchByClearCellStyle(getTableShapeInfo(table)!, [["r_0", "c_2"]]);
    expect(result2).toEqual({});
    expect(result2).not.toHaveProperty("s_0");
    expect(result2).not.toHaveProperty("s_1");
    expect(result2).not.toHaveProperty("s_2");

    const result3 = getPatchByClearCellStyle(getTableShapeInfo(table)!, [["r_1", "c_1"]]);
    expect(result3).toEqual({});
    expect(result3).toHaveProperty("s_0");
    expect(result3).toHaveProperty("s_1");
    expect(result3).not.toHaveProperty("s_2");
  });
});
