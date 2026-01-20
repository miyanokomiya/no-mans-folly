import { describe, test, expect } from "vitest";
import { tableLayout } from "./table";

describe("tableLayout", () => {
  test("should return table layout resutlt", () => {
    const result0 = tableLayout([
      {
        id: "root",
        findex: "Aa",
        type: "box",
        rect: { x: 1000, y: 2000, width: 300, height: 300 },
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
});
