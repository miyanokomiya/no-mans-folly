import { describe, test, expect } from "vitest";
import { formatMerges, getTableShapeInfo, struct, TableShape } from "./table";
import { generateNKeysBetweenAllowSame } from "../../utils/findex";

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
    });
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
