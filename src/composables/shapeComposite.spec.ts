import { describe, expect, test } from "vitest";
import {
  canGroupShapes,
  findBetterShapeAt,
  getDeleteTargetIds,
  getNextShapeComposite,
  getRotatedTargetBounds,
  newShapeComposite,
} from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";
import { LineShape } from "../shapes/line";
import { TextShape } from "../shapes/text";
import { generateKeyBetween } from "fractional-indexing";
import { BoardCardShape } from "../shapes/board/boardCard";
import { BoardRootShape } from "../shapes/board/boardRoot";
import { BoardColumnShape } from "../shapes/board/boardColumn";

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

    test("should ignore shapes supplied as exclude ids", () => {
      const child0 = createShape<TextShape>(getCommonStruct, "text", {
        id: "child0",
        p: { x: 0, y: 0 },
        width: 10,
        height: 10,
      });
      const child1 = createShape<TextShape>(getCommonStruct, "text", {
        id: "child1",
        p: { x: 5, y: 5 },
        width: 10,
        height: 10,
      });
      const shapeComposite = newShapeComposite({
        shapes: [child0, child1],
        getStruct: getCommonStruct,
      });
      expect(shapeComposite.findShapeAt({ x: 7, y: 7 }, undefined, [])).toEqual(child1);
      expect(shapeComposite.findShapeAt({ x: 7, y: 7 }, undefined, [child1.id])).toEqual(child0);
      expect(shapeComposite.findShapeAt({ x: 7, y: 7 }, undefined, [child0.id, child1.id])).toEqual(undefined);
    });
  });

  describe("getMergedShapesInSelectionScope", () => {
    test("should return shapes having the same scope", () => {
      const board0 = createShape(getCommonStruct, "board_root", { id: "board0" });
      const board1 = createShape(getCommonStruct, "board_root", { id: "board1" });
      const column0 = createShape(getCommonStruct, "board_column", { id: "column0", parentId: board0.id });
      const column1 = createShape(getCommonStruct, "board_column", { id: "column1", parentId: board1.id });
      const card0 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
        id: "card0",
        parentId: board0.id,
        columnId: column0.id,
      });
      const card1 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
        id: "card1",
        parentId: board0.id,
        columnId: column0.id,
      });
      const card2 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
        id: "card2",
        parentId: board1.id,
        columnId: column1.id,
      });

      const shapes = [board0, board1, column0, column1, card0, card1, card2];
      const target = newShapeComposite({
        shapes,
        getStruct: getCommonStruct,
      });
      expect(target.getMergedShapesInSelectionScope()).toEqual([board0, board1]);
      expect(target.getMergedShapesInSelectionScope({ parentId: board0.id, scopeKey: "board_column" })).toEqual([
        column0,
      ]);
      expect(target.getMergedShapesInSelectionScope({ parentId: board0.id, scopeKey: "board_card" })).toEqual([
        card0,
        card1,
      ]);
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

    // Ignore excluded shapes
    expect(findBetterShapeAt(target, { x: 7, y: 17 }, undefined, [group0.id])).toEqual(undefined);

    // group scope => should find one among direct children of the group
    expect(findBetterShapeAt(target, { x: 7, y: 7 }, { parentId: group0.id })).toEqual(child0);
    expect(findBetterShapeAt(target, { x: 7, y: 17 }, { parentId: group0.id })).toEqual(child1);
    // group scope => when there's no direct child at the point, try to find one among root ones
    expect(findBetterShapeAt(target, { x: 3, y: 3 }, { parentId: group0.id })).toEqual(shape0);
  });

  test("should be able to find a child of a transparent shape", () => {
    const board0 = createShape<BoardRootShape>(getCommonStruct, "board_root", {
      id: "board0",
      p: { x: 0, y: 0 },
      width: 100,
      height: 100,
    });
    const column0 = createShape<BoardColumnShape>(getCommonStruct, "board_column", {
      id: "column0",
      parentId: board0.id,
      p: { x: 10, y: 10 },
      width: 80,
      height: 80,
    });
    const card0 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
      id: "card0",
      parentId: board0.id,
      columnId: column0.id,
      p: { x: 20, y: 20 },
      width: 60,
      height: 60,
    });
    const shapes = [board0, column0, card0];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    expect(findBetterShapeAt(target, { x: 3, y: 3 })).toEqual(board0);
    expect(findBetterShapeAt(target, { x: 12, y: 12 })).toEqual(column0);
    expect(findBetterShapeAt(target, { x: 27, y: 27 })).toEqual(card0);
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

describe("getRotatedTargetBounds", () => {
  test("should return rotated wrapper rect path for the targets", () => {
    const shape0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "shape0",
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
    });
    const shape1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "shape1",
      p: { x: 100, y: 50 },
      width: 10,
      height: 10,
    });
    const shapeComposite = newShapeComposite({ shapes: [shape0, shape1], getStruct: getCommonStruct });

    const result0 = getRotatedTargetBounds(shapeComposite, [shape0.id, shape1.id], 0);
    expect(result0[0].x).toBeCloseTo(0);
    expect(result0[0].y).toBeCloseTo(0);
    expect(result0[1].x).toBeCloseTo(110);
    expect(result0[1].y).toBeCloseTo(0);
    expect(result0[2].x).toBeCloseTo(110);
    expect(result0[2].y).toBeCloseTo(60);
    expect(result0[3].x).toBeCloseTo(0);
    expect(result0[3].y).toBeCloseTo(60);

    const result1 = getRotatedTargetBounds(shapeComposite, [shape0.id, shape1.id], Math.PI / 2);
    expect(result1[0].x).toBeCloseTo(110);
    expect(result1[0].y).toBeCloseTo(0);
    expect(result1[1].x).toBeCloseTo(110);
    expect(result1[1].y).toBeCloseTo(60);
    expect(result1[2].x).toBeCloseTo(0);
    expect(result1[2].y).toBeCloseTo(60);
    expect(result1[3].x).toBeCloseTo(0);
    expect(result1[3].y).toBeCloseTo(0);
  });
});
