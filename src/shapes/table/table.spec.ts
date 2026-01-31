import { describe, test, expect } from "vitest";
import {
  formatMerges,
  generateTable,
  getCoordsBoundsInfo,
  getIndexStyleValueAt,
  getInnerBordersWithMerge,
  getStyleAreaInfo,
  getTableCoordsLocations,
  getTableShapeInfo,
  getTableSizeByInfo,
  struct,
  TableShape,
} from "./table";
import { generateNKeysBetweenAllowSame } from "../../utils/findex";
import { createFillStyle } from "../../utils/fillStyle";

describe("getTableShapeInfo", () => {
  test("should return table info", () => {
    const findexList = generateNKeysBetweenAllowSame(undefined, undefined, 6);
    const table = struct.create({
      c_1: { id: "c_1", size: 10, findex: findexList[1] },
      c_2: { id: "c_2", size: 10, findex: findexList[2] },
      c_0: { id: "c_0", size: 10, findex: findexList[0] },
      r_1: { id: "r_1", size: 10, findex: findexList[4] },
      r_0: { id: "r_0", size: 10, findex: findexList[3] },
      r_2: { id: "r_2", size: 10, findex: findexList[5] },
      m_0: { id: "m_0", a: ["r_1", "c_1"], b: ["r_0", "c_0"] },
      s_0: { id: "s_0", a: ["r_0", "c_1"], b: ["r_0", "c_0"], t: 0, fill: createFillStyle() },
      s_1: { id: "s_1", a: ["r_1", "c_0"], b: ["r_0", "c_0"], t: 1, vAlign: "top" },
    });
    expect(getTableShapeInfo(table)).toEqual({
      rows: [
        {
          findex: "a3",
          id: "r_0",
          size: 10,
        },
        {
          findex: "a4",
          id: "r_1",
          size: 10,
        },
        {
          findex: "a5",
          id: "r_2",
          size: 10,
        },
      ],
      columns: [
        {
          findex: "a0",
          id: "c_0",
          size: 10,
        },
        {
          findex: "a1",
          id: "c_1",
          size: 10,
        },
        {
          findex: "a2",
          id: "c_2",
          size: 10,
        },
      ],
      merges: [
        {
          id: "m_0",
          a: ["r_0", "c_0"],
          b: ["r_1", "c_1"],
        },
      ],
      mergeAreas: [
        {
          area: [
            [0, 0],
            [1, 1],
          ],
        },
      ],
      resolvedMergeAreas: [
        {
          area: [
            [0, 0],
            [1, 1],
          ],
          style: { fill: createFillStyle(), vAlign: "top" },
        },
      ],
      fillStyles: [
        {
          id: "s_0",
          a: ["r_0", "c_0"],
          b: ["r_0", "c_1"],
          t: 0,
          fill: createFillStyle(),
        },
      ],
      fillStyleAreas: [[[0, 0], [0, 1], { fill: createFillStyle() }]],
      alignStyles: [
        {
          id: "s_1",
          a: ["r_0", "c_0"],
          b: ["r_1", "c_0"],
          t: 1,
          vAlign: "top",
        },
      ],
      alignStyleAreas: [[[0, 0], [1, 0], { vAlign: "top" }]],
    });
  });
});

describe("getInnerBordersWithMerge", () => {
  const findexList = generateNKeysBetweenAllowSame(undefined, undefined, 7);
  const table = struct.create({
    c_0: { id: "c_0", size: 10, findex: findexList[0] },
    c_1: { id: "c_1", size: 10, findex: findexList[1] },
    c_2: { id: "c_2", size: 10, findex: findexList[2] },
    r_0: { id: "r_0", size: 10, findex: findexList[3] },
    r_1: { id: "r_1", size: 10, findex: findexList[4] },
    r_2: { id: "r_2", size: 10, findex: findexList[5] },
    r_3: { id: "r_3", size: 10, findex: findexList[6] },
  });

  test("should return borders with regarding merges", () => {
    const tableInfo0 = getTableShapeInfo({ ...table, m_0: { id: "m_0", a: ["r_0", "c_0"], b: ["r_0", "c_0"] } })!;
    expect(getInnerBordersWithMerge(tableInfo0, getTableSizeByInfo(tableInfo0))).toEqual([
      [
        { x: 10, y: 0 },
        { x: 10, y: 40 },
      ],
      [
        { x: 20, y: 0 },
        { x: 20, y: 40 },
      ],

      [
        { x: 0, y: 10 },
        { x: 30, y: 10 },
      ],
      [
        { x: 0, y: 20 },
        { x: 30, y: 20 },
      ],
      [
        { x: 0, y: 30 },
        { x: 30, y: 30 },
      ],
    ]);

    const tableInfo1 = getTableShapeInfo({ ...table, m_0: { id: "m_0", a: ["r_0", "c_0"], b: ["r_0", "c_1"] } })!;
    expect(getInnerBordersWithMerge(tableInfo1, getTableSizeByInfo(tableInfo1))).toEqual([
      [
        { x: 10, y: 10 },
        { x: 10, y: 40 },
      ],
      [
        { x: 20, y: 0 },
        { x: 20, y: 40 },
      ],

      [
        { x: 0, y: 10 },
        { x: 30, y: 10 },
      ],
      [
        { x: 0, y: 20 },
        { x: 30, y: 20 },
      ],
      [
        { x: 0, y: 30 },
        { x: 30, y: 30 },
      ],
    ]);

    const tableInfo2 = getTableShapeInfo({ ...table, m_0: { id: "m_0", a: ["r_1", "c_1"], b: ["r_2", "c_2"] } })!;
    expect(getInnerBordersWithMerge(tableInfo2, getTableSizeByInfo(tableInfo2))).toEqual([
      [
        { x: 10, y: 0 },
        { x: 10, y: 40 },
      ],
      [
        { x: 20, y: 0 },
        { x: 20, y: 10 },
      ],
      [
        { x: 20, y: 30 },
        { x: 20, y: 40 },
      ],

      [
        { x: 0, y: 10 },
        { x: 30, y: 10 },
      ],
      [
        { x: 0, y: 20 },
        { x: 10, y: 20 },
      ],
      [
        { x: 0, y: 30 },
        { x: 30, y: 30 },
      ],
    ]);

    const tableInfo3 = getTableShapeInfo({ ...table, m_0: { id: "m_0", a: ["r_1", "c_1"], b: ["r_3", "c_2"] } })!;
    expect(getInnerBordersWithMerge(tableInfo3, getTableSizeByInfo(tableInfo3))).toEqual([
      [
        { x: 10, y: 0 },
        { x: 10, y: 40 },
      ],
      [
        { x: 20, y: 0 },
        { x: 20, y: 10 },
      ],

      [
        { x: 0, y: 10 },
        { x: 30, y: 10 },
      ],
      [
        { x: 0, y: 20 },
        { x: 10, y: 20 },
      ],
      [
        { x: 0, y: 30 },
        { x: 10, y: 30 },
      ],
    ]);
  });

  test("should handle merge areas in random order", () => {
    const tableInfo0 = getTableShapeInfo({
      ...table,
      m_0: { id: "m_0", a: ["r_2", "c_0"], b: ["r_2", "c_1"] },
      m_1: { id: "m_1", a: ["r_0", "c_0"], b: ["r_0", "c_1"] },
    })!;
    expect(getInnerBordersWithMerge(tableInfo0, getTableSizeByInfo(tableInfo0))).toEqual([
      [
        { x: 10, y: 10 },
        { x: 10, y: 20 },
      ],
      [
        { x: 10, y: 30 },
        { x: 10, y: 40 },
      ],
      [
        { x: 20, y: 0 },
        { x: 20, y: 40 },
      ],

      [
        { x: 0, y: 10 },
        { x: 30, y: 10 },
      ],
      [
        { x: 0, y: 20 },
        { x: 30, y: 20 },
      ],
      [
        { x: 0, y: 30 },
        { x: 30, y: 30 },
      ],
    ]);
  });
});

describe("formatMerges", () => {
  test("should return optimised merge areas and enclave ids", () => {
    const findexList = generateNKeysBetweenAllowSame(undefined, undefined, 6);
    const table = struct.create({
      c_1: { id: "c_1", size: 10, findex: findexList[1] },
      c_2: { id: "c_2", size: 10, findex: findexList[2] },
      c_0: { id: "c_0", size: 10, findex: findexList[0] },
      r_1: { id: "r_1", size: 10, findex: findexList[4] },
      r_0: { id: "r_0", size: 10, findex: findexList[3] },
      r_2: { id: "r_2", size: 10, findex: findexList[5] },
    });

    const table0 = {
      ...table,
      m_0: { id: "m_0", a: ["r_0", "c_0"], b: ["r_0", "c_1"] },
    } as TableShape;
    expect(formatMerges(getTableShapeInfo(table0)!)).toEqual([
      [
        [0, 0],
        [0, 1],
      ],
    ]);

    const table1 = {
      ...table,
      m_0: { id: "m_0", a: ["r_0", "c_0"], b: ["r_0", "c_1"] },
      m_1: { id: "m_1", a: ["r_0", "c_1"], b: ["r_0", "c_2"] },
    } as TableShape;
    expect(formatMerges(getTableShapeInfo(table1)!)).toEqual([
      [
        [0, 0],
        [0, 2],
      ],
    ]);

    const table2 = {
      ...table,
      m_0: { id: "m_0", a: ["r_0", "c_0"], b: ["r_0", "c_1"] },
      m_1: { id: "m_1", a: ["r_0", "c_0"], b: ["r_2", "c_2"] },
    } as TableShape;
    expect(formatMerges(getTableShapeInfo(table2)!)).toEqual([
      [
        [0, 0],
        [2, 2],
      ],
    ]);
  });
});

describe("getStyleAreaInfo", () => {
  const findexList = generateNKeysBetweenAllowSame(undefined, undefined, 6);
  const table = struct.create({
    c_1: { id: "c_1", size: 20, findex: findexList[1] },
    c_2: { id: "c_2", size: 20, findex: findexList[2] },
    c_0: { id: "c_0", size: 20, findex: findexList[0] },
    r_1: { id: "r_1", size: 10, findex: findexList[4] },
    r_0: { id: "r_0", size: 10, findex: findexList[3] },
    r_2: { id: "r_2", size: 10, findex: findexList[5] },
    m_0: { id: "m_0", a: ["r_1", "c_0"], b: ["r_1", "c_1"] },
  });
  const info = getTableShapeInfo(table)!;
  const coordsLocations = getTableCoordsLocations(info);

  test("", () => {
    const value = { fill: createFillStyle() };
    expect(getStyleAreaInfo(info, coordsLocations, [[0, 0], [0, 1], value])).toEqual({
      rects: [{ x: 0, y: 0, width: 40, height: 10 }],
      value: value,
    });
    expect(getStyleAreaInfo(info, coordsLocations, [[0, 0], [1, 0], value])).toEqual({
      rects: [
        { x: 0, y: 0, width: 20, height: 20 },
        { x: 0, y: 10, width: 40, height: 10 },
      ],
      value: value,
    });
    expect(getStyleAreaInfo(info, coordsLocations, [[1, 1], [2, 1], value])).toEqual({
      rects: [{ x: 20, y: 10, width: 20, height: 20 }],
      value: value,
    });
  });
});

describe("getCoordsBoundsInfo", () => {
  test("should regard merge areas", () => {
    const table = generateTable(6, 6, { width: 60, height: 60 });
    table["m_0"] = {
      id: "m_0",
      a: ["r_2", "c_2"],
      b: ["r_4", "c_4"],
    };
    const tableInfo = getTableShapeInfo(table)!;
    expect(
      getCoordsBoundsInfo(tableInfo, [
        [tableInfo.rows[0].id, tableInfo.columns[0].id],
        [tableInfo.rows[1].id, tableInfo.columns[1].id],
      ])?.bounds,
    ).toEqual([
      [tableInfo.rows[0].id, tableInfo.columns[0].id],
      [tableInfo.rows[1].id, tableInfo.columns[1].id],
    ]);
    expect(
      getCoordsBoundsInfo(tableInfo, [
        [tableInfo.rows[0].id, tableInfo.columns[0].id],
        [tableInfo.rows[2].id, tableInfo.columns[2].id],
      ])?.bounds,
    ).toEqual([
      [tableInfo.rows[0].id, tableInfo.columns[0].id],
      [tableInfo.rows[4].id, tableInfo.columns[4].id],
    ]);
  });
});

describe("getIndexStyleValueAt", () => {
  test("should return style value at the coords", () => {
    const table = generateTable(6, 6, { width: 10, height: 10 });
    table["m_0"] = {
      id: "m_0",
      a: ["r_2", "c_2"],
      b: ["r_3", "c_3"],
    };
    table["s_0"] = {
      id: "s_0",
      a: ["r_2", "c_0"],
      b: ["r_2", "c_4"],
      t: 0,
      fill: createFillStyle(),
    };
    const info = getTableShapeInfo(table)!;
    expect(getIndexStyleValueAt(info, ["r_1", "c_0"])).toEqual({});
    expect(getIndexStyleValueAt(info, ["r_2", "c_0"])).toEqual({
      fill: createFillStyle(),
    });
    expect(getIndexStyleValueAt(info, ["r_2", "c_2"])).toEqual({
      fill: createFillStyle(),
    });
    expect(getIndexStyleValueAt(info, ["r_2", "c_4"])).toEqual({
      fill: createFillStyle(),
    });
    expect(getIndexStyleValueAt(info, ["r_3", "c_2"]), "doesn't regard cell merges").toEqual({});
  });
});
