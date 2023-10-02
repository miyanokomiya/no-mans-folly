import { describe, expect, test } from "vitest";
import { newShapeComposite } from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";

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

  describe("getWrapperRectForShapes", () => {
    test("should return wrapper rectangle for shapes", () => {
      const shape0 = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test0", width: 10, height: 20 });
      const shape1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "test1",
        p: {
          x: 10,
          y: 20,
        },
        width: 10,
        height: 20,
      });

      const shapes = [shape0, shape1];
      const target = newShapeComposite({
        shapes,
        tmpShapeMap: {
          a: { p: { x: 100, y: 100 } },
        },
        getStruct: getCommonStruct,
      });
      const result0 = target.getWrapperRectForShapes([shape0, shape1]);
      expect(result0.x).toBeCloseTo(0);
      expect(result0.y).toBeCloseTo(0);
      expect(result0.width).toBeCloseTo(20);
      expect(result0.height).toBeCloseTo(40);
    });
  });
});
