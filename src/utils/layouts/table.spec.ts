import { describe, test, expect } from "vitest";
import { tableLayout, TableLayoutBox, TableLayoutEntity } from "./table";

describe("tableLayout", () => {
  const root3x3: TableLayoutBox = {
    id: "root",
    findex: "Aa",
    type: "box",
    rect: { x: 0, y: 0, width: 300, height: 300 },
    columns: [
      { id: "c0", size: 100 },
      { id: "c1", size: 100 },
      { id: "c2", size: 100 },
    ],
    rows: [
      { id: "r0", size: 100 },
      { id: "r1", size: 100 },
      { id: "r2", size: 100 },
    ],
  };

  test("should return table layout resutlt", () => {
    const result0 = tableLayout([
      { ...root3x3, rect: { x: 1000, y: 2000, width: 300, height: 300 } },
      {
        id: "0_0",
        findex: "Aa",
        type: "entity",
        parentId: "root",
        coords: ["r0", "c0"],
        rect: { x: 0, y: 0, width: 20, height: 10 },
      },
      {
        id: "0_1_0",
        findex: "Aba",
        type: "entity",
        parentId: "root",
        coords: ["r0", "c1"],
        rect: { x: 0, y: 0, width: 20, height: 10 },
      },
      {
        id: "0_1_1",
        findex: "Abb",
        type: "entity",
        parentId: "root",
        coords: ["r0", "c1"],
        rect: { x: 0, y: 0, width: 20, height: 10 },
      },
      {
        id: "2_2",
        findex: "Cc",
        type: "entity",
        parentId: "root",
        coords: ["r2", "c2"],
        rect: { x: 0, y: 0, width: 40, height: 20 },
      },
    ]);
    expect(result0.map((r) => [r.id, r.rect])).toEqual([
      ["root", { height: 300, width: 300, x: 1000, y: 2000 }],
      ["0_0", { height: 10, width: 20, x: 1040, y: 2045 }],
      ["0_1_0", { height: 10, width: 20, x: 1130, y: 2045 }],
      ["0_1_1", { height: 10, width: 20, x: 1150, y: 2045 }],
      ["2_2", { height: 20, width: 40, x: 1230, y: 2240 }],
    ]);
  });

  test("should regard fullH", () => {
    const item0: TableLayoutEntity = {
      id: "0_0_0",
      findex: "Aa",
      type: "entity",
      parentId: "root",
      coords: ["r0", "c0"],
      rect: { x: 0, y: 0, width: 20, height: 10 },
    };
    const result0 = tableLayout([
      root3x3,
      { ...item0, fullH: true },
      {
        ...item0,
        id: "0_0_1",
        findex: "Bb",
        fullH: false,
      },
    ]);
    expect(result0.map((r) => [r.id, r.rect])).toEqual([
      ["root", { height: 300, width: 300, x: 0, y: 0 }],
      ["0_0_0", { height: 10, width: 80, x: 0, y: 45 }],
      ["0_0_1", { height: 10, width: 20, x: 80, y: 45 }],
    ]);

    const result1 = tableLayout([
      root3x3,
      { ...item0, fullH: true },
      {
        ...item0,
        id: "0_0_1",
        findex: "Bb",
        fullH: true,
      },
    ]);
    expect(result1.map((r) => [r.id, r.rect])).toEqual([
      ["root", { height: 300, width: 300, x: 0, y: 0 }],
      ["0_0_0", { height: 10, width: 50, x: 0, y: 45 }],
      ["0_0_1", { height: 10, width: 50, x: 50, y: 45 }],
    ]);
  });

  test("should regard fullV", () => {
    const item0: TableLayoutEntity = {
      id: "0_0_0",
      findex: "Aa",
      type: "entity",
      parentId: "root",
      coords: ["r0", "c0"],
      rect: { x: 0, y: 0, width: 20, height: 10 },
    };
    const result0 = tableLayout([
      root3x3,
      { ...item0, fullV: true },
      {
        ...item0,
        id: "0_0_1",
        findex: "Bb",
        fullV: false,
      },
    ]);
    expect(result0.map((r) => [r.id, r.rect])).toEqual([
      ["root", { height: 300, width: 300, x: 0, y: 0 }],
      ["0_0_0", { height: 100, width: 20, x: 30, y: 0 }],
      ["0_0_1", { height: 10, width: 20, x: 50, y: 45 }],
    ]);

    const result1 = tableLayout([
      root3x3,
      { ...item0, fullV: true },
      {
        ...item0,
        id: "0_0_1",
        findex: "Bb",
        fullV: true,
      },
    ]);
    expect(result1.map((r) => [r.id, r.rect])).toEqual([
      ["root", { height: 300, width: 300, x: 0, y: 0 }],
      ["0_0_0", { height: 100, width: 20, x: 30, y: 0 }],
      ["0_0_1", { height: 100, width: 20, x: 50, y: 0 }],
    ]);
  });

  test("should handle merge areas", () => {
    const result0 = tableLayout([
      {
        ...root3x3,
        mergeAreas: [
          [
            [0, 0],
            [1, 1],
          ],
        ],
      },
      {
        id: "0_0",
        findex: "Ab",
        type: "entity",
        parentId: "root",
        coords: ["r0", "c0"],
        rect: { x: 0, y: 0, width: 20, height: 10 },
      },
      {
        id: "0_1",
        findex: "Aa",
        type: "entity",
        parentId: "root",
        coords: ["r0", "c1"],
        rect: { x: 0, y: 0, width: 20, height: 10 },
      },
      {
        id: "2_2",
        findex: "Cc",
        type: "entity",
        parentId: "root",
        coords: ["r2", "c2"],
        rect: { x: 0, y: 0, width: 20, height: 10 },
      },
    ]);
    expect(result0.map((r) => [r.id, r.rect])).toEqual([
      ["root", { height: 300, width: 300, x: 0, y: 0 }],
      ["0_0", { height: 10, width: 20, x: 100, y: 95 }],
      ["0_1", { height: 10, width: 20, x: 80, y: 95 }],
      ["2_2", { height: 10, width: 20, x: 240, y: 245 }],
    ]);
  });

  test("should handle fit option of lines", () => {
    const result0 = tableLayout([
      {
        ...root3x3,
        columns: [
          { id: "c0", size: 5, fit: true, baseSize: 1 },
          { id: "c1", size: 5, fit: true, baseSize: 1 },
          { id: "c2", size: 5 },
          { id: "c3", size: 100 },
          { id: "c4", size: 100, fit: true, baseSize: 1 },
        ],
        rows: [
          { id: "r0", size: 5, fit: true, baseSize: 2 },
          { id: "r1", size: 5, fit: true, baseSize: 1 },
          { id: "r2", size: 5 },
          { id: "r3", size: 100 },
          { id: "r4", size: 100, fit: true, baseSize: 1 },
        ],
        mergeAreas: [
          [
            [1, 1],
            [2, 2],
          ],
        ],
      },
      {
        id: "0_0",
        findex: "Aa",
        type: "entity",
        parentId: "root",
        coords: ["r0", "c0"],
        rect: { x: 0, y: 0, width: 20, height: 10 },
      },
      {
        id: "0_1",
        findex: "Aba",
        type: "entity",
        parentId: "root",
        coords: ["r0", "c1"],
        rect: { x: 0, y: 0, width: 20, height: 10 },
      },
      {
        id: "1_0",
        findex: "Cc",
        type: "entity",
        parentId: "root",
        coords: ["r1", "c0"],
        rect: { x: 0, y: 0, width: 40, height: 20 },
      },
      {
        id: "1_1",
        findex: "Dd",
        type: "entity",
        parentId: "root",
        coords: ["r1", "c1"],
        rect: { x: 0, y: 0, width: 20, height: 10 },
      },
      {
        id: "2_2",
        findex: "Ee",
        type: "entity",
        parentId: "root",
        coords: ["r2", "c2"],
        rect: { x: 0, y: 0, width: 40, height: 20 },
      },
    ]);
    expect(result0.map((r) => [r.id, r.rect])).toEqual([
      ["root", { height: 240, width: 300, x: 0, y: 0 }],
      ["0_0", { height: 10, width: 20, x: 10, y: 0 }],
      ["0_1", { height: 10, width: 20, x: 57.5, y: 0 }],
      ["1_0", { height: 20, width: 40, x: 0, y: 12.5 }],
      ["1_1", { height: 10, width: 20, x: 40, y: 20 }],
      ["2_2", { height: 20, width: 40, x: 60, y: 15 }],
    ]);
    expect((result0[0] as TableLayoutBox).rows.map((l) => l.size)).toEqual([10, 25, 5, 100, 100]);
    expect((result0[0] as TableLayoutBox).columns.map((l) => l.size)).toEqual([40, 55, 5, 100, 100]);
  });
});
