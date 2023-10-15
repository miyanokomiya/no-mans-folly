import { describe, expect, test } from "vitest";
import {
  canGroupShapes,
  findBetterShapeAt,
  getDeleteTargetIds,
  getNextShapeComposite,
  newShapeComposite,
} from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";
import { LineShape } from "../shapes/line";
import { TextShape } from "../shapes/text";
import { generateKeyBetween } from "fractional-indexing";

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

  describe("findShapeAt", () => {
    test("should be able to find a child shape when a parent is transparent selection", () => {
      const line = createShape<LineShape>(getCommonStruct, "line", {
        id: "line",
        p: { x: 0, y: 0 },
        q: { x: 100, y: 100 },
      });
      const child0 = createShape<TextShape>(getCommonStruct, "text", {
        id: "child0",
        parentId: line.id,
        p: { x: 0, y: 0 },
        width: 10,
        height: 10,
        lineAttached: 0,
      });
      const child1 = createShape<TextShape>(getCommonStruct, "text", {
        id: "child1",
        parentId: line.id,
        p: { x: 50, y: 50 },
        width: 10,
        height: 10,
        lineAttached: 0.5,
      });

      const shapes = [line, child0, child1];
      const target = newShapeComposite({
        shapes,
        getStruct: getCommonStruct,
      });

      expect(target.findShapeAt({ x: -50, y: -50 })).toEqual(undefined);
      expect(target.findShapeAt({ x: 90, y: 90 })).toEqual(line);
      expect(target.findShapeAt({ x: 5, y: 8 })).toEqual(child0);
      expect(target.findShapeAt({ x: 50, y: 55 })).toEqual(child1);
    });
  });
});

describe("findBetterShapeAt", () => {
  test("should find better shape at the point", () => {
    const shape0 = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "shape0", width: 10, height: 10 });
    const shape1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "shape1",
      p: { x: 10, y: 10 },
      width: 10,
      height: 10,
    });
    const group0 = createShape(getCommonStruct, "group", { id: "group0" });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
      p: { x: 5, y: 5 },
      width: 10,
      height: 10,
    });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child1",
      parentId: group0.id,
      p: { x: 5, y: 15 },
      width: 10,
      height: 10,
    });

    const shapes = [shape0, shape1, group0, child0, child1];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    // no scope => should find one among root ones
    expect(findBetterShapeAt(target, { x: 3, y: 3 })).toEqual(shape0);
    expect(findBetterShapeAt(target, { x: 7, y: 7 })).toEqual(group0);
    expect(findBetterShapeAt(target, { x: 7, y: 17 })).toEqual(group0);

    // group scope => should find one among direct children of the group
    expect(findBetterShapeAt(target, { x: 7, y: 7 }, group0.id)).toEqual(child0);
    expect(findBetterShapeAt(target, { x: 7, y: 17 }, group0.id)).toEqual(child1);
    // group scope => when there's no direct child at the point, try to find one among root ones
    expect(findBetterShapeAt(target, { x: 3, y: 3 }, group0.id)).toEqual(shape0);
  });
});

describe("getDeleteTargetIds", () => {
  test("should return group ids that will become empty", () => {
    const group0 = createShape(getCommonStruct, "group", { id: "group0" });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
      p: { x: 5, y: 5 },
      width: 10,
      height: 10,
    });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child1",
      parentId: group0.id,
      p: { x: 5, y: 15 },
      width: 10,
      height: 10,
    });

    const shapes = [group0, child0, child1];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    expect(getDeleteTargetIds(target, ["child0"])).toEqual(["child0"]);
    expect(getDeleteTargetIds(target, ["child1"])).toEqual(["child1"]);
    expect(getDeleteTargetIds(target, ["child0", "child1"])).toEqual(["child0", "child1", "group0"]);
  });

  test("should not return text ids even though they will have no children", () => {
    const text = createShape(getCommonStruct, "text", { id: "text" });
    const child0 = createShape(getCommonStruct, "text", {
      id: "child0",
      parentId: text.id,
    });
    const child1 = createShape(getCommonStruct, "text", {
      id: "child1",
      parentId: text.id,
    });

    const shapes = [text, child0, child1];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    expect(getDeleteTargetIds(target, ["child0", "child1"])).toEqual(["child0", "child1"]);
  });
});

describe("canGroupShapes", () => {
  test("should return true when shapes can be grouped", () => {
    const shape0 = createShape(getCommonStruct, "text", { id: "shape0" });
    const shape1 = createShape(getCommonStruct, "text", {
      id: "shape1",
    });
    const shape2 = createShape(getCommonStruct, "text", {
      id: "shape2",
    });
    const group0 = createShape(getCommonStruct, "group", { id: "group0" });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
    });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child1",
      parentId: group0.id,
    });

    const shapes = [shape0, shape1, shape2, group0, child0, child1];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    expect(canGroupShapes(target, ["shape0"])).toBe(false);
    expect(canGroupShapes(target, ["shape0", "shape1"])).toBe(true);
    expect(canGroupShapes(target, ["shape0", "shape1", "shape2"])).toBe(true);
    expect(canGroupShapes(target, ["group0", "child0"])).toBe(false);
    expect(canGroupShapes(target, ["child0", "child1"])).toBe(false);
    expect(canGroupShapes(target, ["shape0", "child0"])).toBe(false);
  });
});

describe("getNextShapeComposite", () => {
  test("should return next shape composite applied the patches", () => {
    const shape0 = createShape(getCommonStruct, "text", { id: "shape0", findex: generateKeyBetween(null, null) });
    const shape1 = createShape(getCommonStruct, "text", {
      id: "shape1",
      findex: generateKeyBetween(shape0.findex, null),
    });
    const shape2 = createShape(getCommonStruct, "text", {
      id: "shape2",
      findex: generateKeyBetween(shape1.findex, null),
    });
    const shape3 = createShape(getCommonStruct, "text", {
      id: "shape3",
      findex: generateKeyBetween(shape2.findex, null),
    });

    const shapes = [shape0, shape1, shape2];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    expect(
      getNextShapeComposite(target, {
        add: [shape3],
        update: { [shape0.id]: { p: { x: 10, y: 10 } } },
        delete: ["shape1"],
      }).shapes,
    ).toEqual([{ ...shape0, p: { x: 10, y: 10 } }, shape2, shape3]);
  });

  test("should sort shapes by updated findex", () => {
    const shape0 = createShape(getCommonStruct, "text", { id: "shape0", findex: generateKeyBetween(null, null) });
    const shape1 = createShape(getCommonStruct, "text", {
      id: "shape1",
      findex: generateKeyBetween(shape0.findex, null),
    });
    const shape2 = createShape(getCommonStruct, "text", {
      id: "shape2",
      findex: generateKeyBetween(shape1.findex, null),
    });
    const shape3 = createShape(getCommonStruct, "text", {
      id: "shape3",
      findex: generateKeyBetween(shape0.findex, shape1.findex),
    });

    const shapes = [shape0, shape1, shape2];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    expect(
      getNextShapeComposite(target, {
        add: [shape3],
        update: { [shape2.id]: { findex: generateKeyBetween(null, shape0.findex) } },
      }).shapes,
    ).toEqual([{ ...shape2, findex: generateKeyBetween(null, shape0.findex) }, shape0, shape3, shape1]);
  });
});
