import { describe, expect, test } from "vitest";
import { newShapeComposite } from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";

describe("newShapeComposite", () => {
  test("should compose shape tree", () => {
    const shapes = [
      createShape(getCommonStruct, "text", { id: "label", parentId: "line" }),
      createShape(getCommonStruct, "line", { id: "line" }),
      createShape(getCommonStruct, "rectangle", { id: "a" }),
      createShape(getCommonStruct, "rectangle", { id: "b" }),
    ];
    const target = newShapeComposite({
      shapes,
      tmpShapeMap: {
        a: { p: { x: 100, y: 100 } },
      },
      getStruct: getCommonStruct,
    });
    expect(target.shapes).toEqual(shapes);
    expect(target.tmpShapeMap).toEqual({
      a: { p: { x: 100, y: 100 } },
    });
    expect(target.mergedShapes).toEqual([shapes[0], shapes[1], { ...shapes[2], p: { x: 100, y: 100 } }, shapes[3]]);
    expect(target.mergedShapeMap).toEqual({
      label: shapes[0],
      line: shapes[1],
      a: { ...shapes[2], p: { x: 100, y: 100 } },
      b: shapes[3],
    });
    expect(target.mergedShapeTree).toEqual([
      { id: "line", children: [{ id: "label", children: [], parentId: "line" }] },
      { id: "a", children: [] },
      { id: "b", children: [] },
    ]);
    expect(target.getAllBranchMergedShapes(["line"])).toEqual([shapes[1], shapes[0]]);
  });
});
