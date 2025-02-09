import { describe, expect, test } from "vitest";
import {
  canGroupShapes,
  findBetterShapeAt,
  getAllShapeRangeWithinComposite,
  getClosestShapeByType,
  getDeleteTargetIds,
  getNextShapeComposite,
  getRotatedTargetBounds,
  newShapeComposite,
  replaceTmpShapeMapOfShapeComposite,
  swapShapeParent,
} from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";
import { LineShape } from "../shapes/line";
import { TextShape } from "../shapes/text";
import { BoardCardShape } from "../shapes/board/boardCard";
import { BoardRootShape } from "../shapes/board/boardRoot";
import { BoardColumnShape } from "../shapes/board/boardColumn";
import { TreeRootShape } from "../shapes/tree/treeRoot";
import { TreeNodeShape } from "../shapes/tree/treeNode";
import { getNextTreeLayout } from "./shapeHandlers/treeHandler";
import { patchPipe, toList, toMap } from "../utils/commons";
import { generateKeyBetween } from "../utils/findex";
import { Shape } from "../models";

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

  describe("getAllTransformTargets", () => {
    test("should not return shapes that are children of unbound parents when ignoreUnbound is true", () => {
      const shapes = [
        createShape(getCommonStruct, "text", { id: "label", parentId: "line" }),
        createShape(getCommonStruct, "line", { id: "line" }),
        createShape(getCommonStruct, "align_box", { id: "align" }),
        createShape(getCommonStruct, "rectangle", { id: "a", parentId: "align" }),
      ];
      const target = newShapeComposite({
        shapes,
        getStruct: getCommonStruct,
      });
      expect(
        target
          .getAllTransformTargets(["line", "align"], true)
          .map((s) => s.id)
          .sort(),
      ).toEqual(["align", "label", "line"]);
      expect(
        target
          .getAllTransformTargets(["line", "align"])
          .map((s) => s.id)
          .sort(),
      ).toEqual(["a", "align", "label", "line"]);
    });
  });

  describe("getSortedMergedShapeTree", () => {
    test("should sort root shapes based on orderPriority", () => {
      const shapes = [
        createShape(getCommonStruct, "rectangle", { id: "a" }),
        createShape(getCommonStruct, "frame", { id: "frame1" }),
        createShape(getCommonStruct, "rectangle", { id: "b" }),
        createShape(getCommonStruct, "frame", { id: "frame2" }),
      ];
      const target = newShapeComposite({
        shapes,
        getStruct: getCommonStruct,
      });
      expect(target.getSortedMergedShapeTree().map((s) => s.id)).toEqual(["frame1", "frame2", "a", "b"]);
    });
  });

  describe("getLocalSpace", () => {
    test("should return local space of the shape", () => {
      const shape0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
        id: "test0",
        width: 10,
        height: 20,
        rotation: Math.PI / 2,
      });

      const shapes = [shape0];
      const target = newShapeComposite({ shapes, getStruct: getCommonStruct });
      const result0 = target.getLocalSpace(shape0);
      expect(result0[0]).toEqualRect({ x: 0, y: 0, width: 10, height: 20 });
      expect(result0[1]).toBeCloseTo(Math.PI / 2);
    });
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

  describe("getLocationRateOnShape", () => {
    test("should return location rate on the shape", () => {
      const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test", width: 10, height: 20 });
      const shapes = [shape];
      const target = newShapeComposite({
        shapes,
        tmpShapeMap: {
          a: { p: { x: 100, y: 100 } },
        },
        getStruct: getCommonStruct,
      });
      const result0 = target.getLocationRateOnShape(shape, { x: 0, y: 0 });
      expect(result0.x).toBeCloseTo(0);
      expect(result0.y).toBeCloseTo(0);

      const result1 = target.getLocationRateOnShape(shape, { x: 2, y: 15 });
      expect(result1.x).toBeCloseTo(0.2);
      expect(result1.y).toBeCloseTo(3 / 4);

      const result2 = target.getLocationRateOnShape({ ...shape, rotation: Math.PI / 2 }, { x: 5, y: 14 });
      expect(result2.x).toBeCloseTo(0.9);
      expect(result2.y).toBeCloseTo(0.5);
    });
  });

  describe("getShapeTreeLocalRect", () => {
    const getShapes = () => {
      const root = createShape<TreeRootShape>(getCommonStruct, "tree_root", {
        id: "root",
        p: { x: 100, y: 200 },
        width: 10,
        height: 20,
      });
      const child0 = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
        id: "child0",
        parentId: root.id,
        treeParentId: root.id,
        width: 20,
        height: 30,
      });
      const child1 = { ...child0, id: "child1" };
      return [root, child0, child1];
    };

    test("should return local rect of the shape tree", () => {
      const shapes = getShapes();
      const patched = patchPipe(
        [
          () => {
            return getNextTreeLayout(
              newShapeComposite({
                shapes,
                getStruct: getCommonStruct,
              }),
              shapes[0].id,
            );
          },
        ],
        toMap(shapes),
      );
      const target = newShapeComposite({
        shapes: toList(patched.result),
        getStruct: getCommonStruct,
      });
      const result0 = target.getShapeTreeLocalRect(shapes[0]);
      expect(result0).toEqualRect({ x: 0, y: -35, width: 80, height: 90 });
    });

    test("should return local rect of the shape tree: rotated", () => {
      const shapes = getShapes().map((s) => ({ ...s, rotation: Math.PI / 2 }));
      const patched = patchPipe(
        [
          () => {
            return getNextTreeLayout(
              newShapeComposite({
                shapes,
                getStruct: getCommonStruct,
              }),
              shapes[0].id,
            );
          },
        ],
        toMap(shapes),
      );
      const target = newShapeComposite({
        shapes: toList(patched.result),
        getStruct: getCommonStruct,
      });
      const result0 = target.getShapeTreeLocalRect(patched.result[shapes[0].id]);
      expect(result0).toEqualRect({ x: 0, y: -35, width: 80, height: 90 });
    });
  });

  describe("rotateShapeTree", () => {
    const getShapes = () => {
      const root = createShape<TreeRootShape>(getCommonStruct, "tree_root", {
        id: "root",
        p: { x: 100, y: 200 },
        width: 10,
        height: 20,
      });
      const child0 = createShape<TreeNodeShape>(getCommonStruct, "tree_node", {
        id: "child0",
        parentId: root.id,
        treeParentId: root.id,
        width: 20,
        height: 30,
      });
      const child1 = { ...child0, id: "child1" };
      return [root, child0, child1];
    };

    test("should return patch info to rotate the tree", () => {
      const shapes = getShapes();
      const patched = patchPipe(
        [
          () => {
            return getNextTreeLayout(
              newShapeComposite({
                shapes,
                getStruct: getCommonStruct,
              }),
              shapes[0].id,
            );
          },
        ],
        toMap(shapes),
      );
      const target = newShapeComposite({
        shapes: toList(patched.result),
        getStruct: getCommonStruct,
      });
      const result0 = target.rotateShapeTree(shapes[0].id, Math.PI / 2);
      expect(result0[shapes[0].id].rotation).toBeCloseTo(Math.PI / 2);
      expect(result0[shapes[0].id].p).toBe(undefined);
      expect(result0[shapes[1].id].p).toEqualPoint({ x: 125, y: 260 });
      expect(result0[shapes[1].id].rotation).toBeCloseTo(Math.PI / 2);
      expect(result0[shapes[2].id].p).toEqualPoint({ x: 65, y: 260 });
      expect(result0[shapes[2].id].rotation).toBeCloseTo(Math.PI / 2);
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
      // still should respect exclude ids
      expect(target.findShapeAt({ x: 50, y: 55 }, undefined, [child1.id])).toEqual(line);
      expect(target.findShapeAt({ x: 50, y: 55 }, undefined, [child1.id, line.id])).toEqual(undefined);
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

  describe("isPointOn", () => {
    test("should return true when the point is on the shape", () => {
      const shape0 = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "test0", width: 10, height: 20 });

      const shapes = [shape0];
      const target = newShapeComposite({ shapes, getStruct: getCommonStruct });

      expect(target.isPointOn(shape0, { x: -50, y: -50 })).toBe(false);
      expect(target.isPointOn(shape0, { x: 5, y: 5 })).toBe(true);
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
      expect(
        target
          .getMergedShapesInSelectionScope()
          .map((s) => s.id)
          .sort(),
      ).toEqual(shapes.map((s) => s.id).sort());
      expect(target.getMergedShapesInSelectionScope({ parentId: undefined })).toEqual([board0, board1]);
      expect(target.getMergedShapesInSelectionScope({ parentId: board0.id, scopeKey: "board_column" })).toEqual([
        column0,
      ]);
      expect(target.getMergedShapesInSelectionScope({ parentId: board0.id, scopeKey: "board_card" })).toEqual([
        card0,
        card1,
      ]);
    });

    test("should respect shapeType of the scope", () => {
      const group = createShape(getCommonStruct, "group", { id: "group" });
      const rect0 = createShape(getCommonStruct, "rectangle", { id: "rect0", parentId: group.id });
      const line0 = createShape(getCommonStruct, "line", { id: "line0", parentId: group.id });
      const rect1 = createShape(getCommonStruct, "rectangle", { id: "rect1" });

      const shapes = [group, rect0, line0, rect1];
      const target = newShapeComposite({
        shapes,
        getStruct: getCommonStruct,
      });
      expect(target.getMergedShapesInSelectionScope({ shapeType: "rectangle" })).toEqual([rect1]);
      expect(target.getMergedShapesInSelectionScope({ parentId: group.id, shapeType: "rectangle" })).toEqual([rect0]);
      expect(target.getMergedShapesInSelectionScope({ shapeType: "line" })).toEqual([]);
    });

    test("should ignore parent scope when anyParent is set true", () => {
      const group = createShape(getCommonStruct, "group", { id: "group" });
      const rect0 = createShape(getCommonStruct, "rectangle", { id: "rect0", parentId: group.id });
      const line0 = createShape(getCommonStruct, "line", { id: "line0", parentId: group.id });
      const rect1 = createShape(getCommonStruct, "rectangle", { id: "rect1" });

      const shapes = [group, rect0, line0, rect1];
      const target = newShapeComposite({
        shapes,
        getStruct: getCommonStruct,
      });
      expect(target.getMergedShapesInSelectionScope({ parentId: group.id }, false, true)).toEqual([
        group,
        rect0,
        line0,
        rect1,
      ]);
      expect(
        target.getMergedShapesInSelectionScope({ parentId: group.id, shapeType: "rectangle" }, false, true),
      ).toEqual([rect0, rect1]);
      expect(target.getMergedShapesInSelectionScope({ shapeType: "rectangle" }, false, true)).toEqual([rect0, rect1]);
    });
  });

  describe("hasParent", () => {
    test("should return true when a shape's parent exist", () => {
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
        parentId: "unknown",
        p: { x: 5, y: 15 },
        width: 10,
        height: 10,
      });

      const shapes = [group0, child0, child1];
      const target = newShapeComposite({
        shapes,
        getStruct: getCommonStruct,
      });

      // no scope => should find one among root ones
      expect(target.hasParent(group0)).toBe(false);
      expect(target.hasParent(child0)).toBe(true);
      expect(target.hasParent(child1)).toBe(false);
    });
  });

  describe("attached", () => {
    test("should return true when a shape has valid attachment", () => {
      const shape0 = createShape(getCommonStruct, "rectangle", {
        id: "shape",
        attachment: {
          id: "line",
          to: { x: 0, y: 0 },
          anchor: { x: 0, y: 0 },
          rotationType: "relative",
          rotation: 0,
        },
      });
      const shape1 = { ...shape0, attachment: { ...shape0.attachment, id: "unknown" } } as Shape;
      const shape2 = { ...shape0, attachment: undefined } as Shape;
      const line = createShape(getCommonStruct, "line", { id: "line" });

      const shapes = [shape0, shape1, shape2, line];
      const target = newShapeComposite({
        shapes,
        getStruct: getCommonStruct,
      });

      expect(target.attached(shape0)).toBe(true);
      expect(target.attached(shape1)).toBe(false);
      expect(target.attached(shape2)).toBe(false);
    });
  });

  describe("canAttach", () => {
    test("should return true when a shape can attach to other shape", () => {
      const group = createShape(getCommonStruct, "group", {
        id: "group",
      });
      const align = createShape(getCommonStruct, "align_box", {
        id: "align",
      });
      const a = createShape(getCommonStruct, "rectangle", {
        id: "a",
        parentId: group.id,
      });
      const b = {
        id: "b",
        parentId: align.id,
      } as Shape;
      const c = {
        id: "c",
        parentId: "unknown",
      } as Shape;
      const line = createShape(getCommonStruct, "line", {
        id: "line",
      });
      const frame = createShape(getCommonStruct, "frame", {
        id: "frame",
      });

      const shapes = [group, align, a, b, c, line, frame];
      const target = newShapeComposite({
        shapes,
        getStruct: getCommonStruct,
      });

      expect(target.canAttach(group)).toBe(true);
      expect(target.canAttach(align)).toBe(true);
      expect(target.canAttach(a)).toBe(true);
      expect(target.canAttach(b)).toBe(false);
      expect(target.canAttach(c)).toBe(true);
      expect(target.canAttach(line)).toBe(false);
      expect(target.canAttach(frame)).toBe(false);
    });
  });

  describe("getShapeCompositeWithoutTmpInfo", () => {
    const group0 = createShape(getCommonStruct, "group", { id: "group0" });
    const child0 = createShape(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
    });
    const child1 = createShape(getCommonStruct, "rectangle", {
      id: "child1",
      parentId: group0.id,
    });

    test("should return new shape composite without having tmp shapes", () => {
      const shapes = [group0, child0, child1];
      const target = newShapeComposite({
        shapes,
        tmpShapeMap: { [child0.id]: { p: { x: 10, y: 10 } } },
        getStruct: getCommonStruct,
      }).getShapeCompositeWithoutTmpInfo();
      expect(target.shapes).toEqual(shapes);
      expect(target.tmpShapeMap).toEqual({});
    });
  });

  describe("getShapeCompositeWithoutTmpInfo", () => {
    const group0 = createShape(getCommonStruct, "group", { id: "group0" });
    const child0 = createShape(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
    });
    const child1 = createShape(getCommonStruct, "rectangle", {
      id: "child1",
      parentId: group0.id,
    });
    const group10 = createShape(getCommonStruct, "group", { id: "group10" });
    const child10 = createShape(getCommonStruct, "rectangle", {
      id: "child10",
      parentId: group10.id,
    });

    test("should return new shape composite only containing shapes belonging to target trees", () => {
      const shapes = [group0, child0, child1, group10, child10];
      const composite = newShapeComposite({
        shapes,
        tmpShapeMap: { [child0.id]: { p: { x: 10, y: 10 } } },
        getStruct: getCommonStruct,
      });

      const target0 = composite.getSubShapeComposite([group10.id]);
      expect(target0.shapes).toEqual([group10, child10]);
      expect(target0.tmpShapeMap).toEqual({});

      const target1 = composite.getSubShapeComposite([group0.id, group10.id]);
      expect(target1.shapes).toEqual(shapes);
      expect(target1.tmpShapeMap).toEqual({});
    });
  });

  describe("Circular parent reference", () => {
    const group0 = createShape(getCommonStruct, "group", { id: "group0", parentId: "group10" });
    const child0 = createShape(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
    });
    const child1 = { ...child0, id: "child1", parentId: group0.id };
    const group10 = { ...group0, id: "group10", parentId: group0.id };
    const child10 = { ...child0, id: "child10", parentId: group10.id };
    const child11 = { ...child0, id: "child11", parentId: group10.id };

    test("should sever circular parent reference", () => {
      const shapes = [group0, child0, child1, group10, child10, child11];
      const composite = newShapeComposite({ shapes, getStruct: getCommonStruct });
      expect(composite.mergedShapeTree).toEqual([
        {
          id: group10.id,
          children: [
            {
              id: group0.id,
              parentId: group10.id,
              children: [
                { id: child0.id, parentId: group0.id, children: [] },
                { id: child1.id, parentId: group0.id, children: [] },
              ],
            },
            { id: child10.id, parentId: group10.id, children: [] },
            { id: child11.id, parentId: group10.id, children: [] },
          ],
        },
      ]);
      expect(composite.shapes.find((s) => s.id === group10.id)!.parentId).toBe(undefined);
      expect(composite.shapeMap[group10.id].parentId).toBe(undefined);
    });
  });

  describe("getSubShapeComposite", () => {
    const group0 = createShape(getCommonStruct, "group", { id: "group0" });
    const child0 = createShape(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
    });
    const child1 = { ...child0, id: "child1", parentId: group0.id };
    const group10 = { ...group0, id: "group10", parentId: group0.id };
    const child10 = { ...child0, id: "child10", parentId: group10.id };
    const child11 = { ...child0, id: "child11", parentId: group10.id };

    test("should return sub shape composite", () => {
      const shapes = [group0, child0, child1, group10, child10, child11];
      const composite = newShapeComposite({ shapes, getStruct: getCommonStruct });

      const sub1 = composite.getSubShapeComposite([child10.id]);
      expect(sub1.shapes.map((s) => s.id)).toEqual([child10.id]);

      const sub2 = composite.getSubShapeComposite([group10.id]);
      expect(sub2.shapes.map((s) => s.id)).toEqual([group10.id, child10.id, child11.id]);
    });

    test("should apply update when passed", () => {
      const shapes = [group0, child0, child1];
      const composite = newShapeComposite({ shapes, getStruct: getCommonStruct });

      const sub1 = composite.getSubShapeComposite([group0.id], {
        [child0.id]: { parentId: undefined },
      });
      expect(sub1.mergedShapeTree.map((t) => t.id)).toEqual([group0.id, child0.id]);

      const sub2 = composite.getSubShapeComposite([group0.id], {
        [child0.id]: { p: { x: 1, y: 2 } },
      });
      expect(sub2.mergedShapeTree.map((t) => t.id)).toEqual([group0.id]);
      expect(sub2.shapeMap[child0.id]).toEqual({ ...child0, p: { x: 1, y: 2 } });
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

  const board0 = createShape<BoardRootShape>(getCommonStruct, "board_root", {
    id: "board0",
    p: { x: 0, y: 0 },
    width: 200,
    height: 200,
  });
  const column0 = createShape<BoardColumnShape>(getCommonStruct, "board_column", {
    id: "column0",
    parentId: board0.id,
    p: { x: 10, y: 10 },
    width: 80,
    height: 80,
  });
  const column1 = createShape<BoardColumnShape>(getCommonStruct, "board_column", {
    id: "column1",
    parentId: column0.id,
    p: { x: 100, y: 10 },
    width: 180,
    height: 180,
  });
  const card0 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
    id: "card0",
    parentId: board0.id,
    columnId: column1.id,
    p: { x: 20, y: 20 },
    width: 60,
    height: 60,
  });
  const card1 = createShape<BoardCardShape>(getCommonStruct, "board_card", {
    id: "card1",
    parentId: board0.id,
    columnId: column1.id,
    p: { x: 120, y: 20 },
    width: 60,
    height: 60,
  });
  const shapes = [board0, column0, column1, card0, card1];
  const target = newShapeComposite({
    shapes,
    getStruct: getCommonStruct,
  });

  test("should be able to find a child of a transparent shape", () => {
    expect(findBetterShapeAt(target, { x: 3, y: 3 })).toEqual(board0);
    expect(findBetterShapeAt(target, { x: 12, y: 12 })).toEqual(column0);
    expect(findBetterShapeAt(target, { x: 27, y: 27 })).toEqual(card0);
  });

  test("should ignore the scope key", () => {
    expect(findBetterShapeAt(target, { x: 27, y: 27 }, { parentId: board0.id, scopeKey: "board_column" })).toEqual(
      card0,
    );
    expect(findBetterShapeAt(target, { x: 127, y: 27 }, { parentId: board0.id, scopeKey: "board_column" })).toEqual(
      card1,
    );
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

describe("replaceTmpShapeMapOfShapeComposite", () => {
  test("should return next shape composite applied the patches", () => {
    const shape0 = createShape(getCommonStruct, "group", { id: "shape0", findex: generateKeyBetween(null, null) });
    const shape1 = createShape(getCommonStruct, "text", {
      id: "shape1",
      findex: generateKeyBetween(shape0.findex, null),
    });

    const shapes = [shape0, shape1];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const result0 = replaceTmpShapeMapOfShapeComposite(target, {
      [shape0.id]: { p: { x: 10, y: 10 } },
    });
    expect(result0.shapes).toEqual(shapes);
    expect(result0.mergedShapes).toEqual([{ ...shape0, p: { x: 10, y: 10 } }, shape1]);
    expect(result0.mergedShapeTree).toBe(target.mergedShapeTree);

    const result1 = replaceTmpShapeMapOfShapeComposite(target, {
      [shape0.id]: { parentId: shape0.id },
    });
    expect(result1.shapes).toEqual(shapes);
    expect(result1.mergedShapes).toEqual([{ ...shape0, parentId: shape0.id }, shape1]);
    expect(result1.mergedShapeTree).not.toBe(target.mergedShapeTree);
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

describe("getClosestShapeByType", () => {
  test("should return closest shape having the type", () => {
    const group0 = createShape(getCommonStruct, "group", { id: "group0" });
    const child0 = createShape(getCommonStruct, "group", {
      id: "child0",
      parentId: group0.id,
    });
    const child1 = createShape(getCommonStruct, "align_box", {
      id: "child1",
      parentId: child0.id,
    });
    const child2 = createShape(getCommonStruct, "rectangle", {
      id: "child2",
      parentId: child1.id,
    });

    const shapes = [group0, child0, child1, child2];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    expect(getClosestShapeByType(target, "child2", "group")).toEqual(child0);
    expect(getClosestShapeByType(target, "child2", "align_box")).toEqual(child1);
    // Should include the target
    expect(getClosestShapeByType(target, "child2", "rectangle")).toEqual(child2);
  });
});

describe("swapShapeParent", () => {
  const first = createShape(getCommonStruct, "group", { id: "first", findex: "a9" });
  const group0 = createShape(getCommonStruct, "group", { id: "group0", findex: "aA" });
  const child0 = createShape(getCommonStruct, "rectangle", {
    id: "child0",
    findex: "aB",
    parentId: group0.id,
  });
  const child1 = createShape(getCommonStruct, "rectangle", {
    id: "child1",
    findex: "aC",
    parentId: group0.id,
  });
  const child2 = createShape(getCommonStruct, "rectangle", {
    id: "child2",
    findex: "aD",
    parentId: group0.id,
  });
  const last = createShape(getCommonStruct, "group", { id: "last", findex: "aZ" });

  test("should swap the parent: from a group to other group", () => {
    const group1 = createShape(getCommonStruct, "group", { id: "group1", findex: "aE" });
    const target = createShape(getCommonStruct, "rectangle", {
      id: "target",
      findex: "aF",
      parentId: group1.id,
    });
    const child10 = createShape(getCommonStruct, "rectangle", {
      id: "child10",
      findex: "aG",
      parentId: group1.id,
    });

    const shapes = [group0, child0, child1, child2, group1, target, child10];
    const composite = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });
    expect(swapShapeParent(composite, target.id, child0.id, "above", () => "")).toEqual({
      update: { [target.id]: { parentId: group0.id, findex: "aA" } },
    });
    expect(swapShapeParent(composite, target.id, child0.id, "below", () => "")).toEqual({
      update: { [target.id]: { parentId: group0.id, findex: "aBV" } },
    });
  });

  test("should swap the parent: from a group to root", () => {
    const group1 = createShape(getCommonStruct, "group", { id: "group1", findex: "aE" });
    const target = createShape(getCommonStruct, "rectangle", {
      id: "target",
      findex: "aF",
      parentId: group1.id,
    });
    const child10 = createShape(getCommonStruct, "rectangle", {
      id: "child10",
      findex: "aG",
      parentId: group1.id,
    });

    const shapes = [first, group0, child0, child1, child2, group1, target, child10, last];
    const composite = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });
    expect(swapShapeParent(composite, target.id, group0.id, "above", () => "")).toEqual({
      update: { [target.id]: { parentId: undefined, findex: "a9V" } },
    });
    expect(swapShapeParent(composite, target.id, group0.id, "below", () => "")).toEqual({
      update: { [target.id]: { parentId: undefined, findex: "aC" } },
    });
  });

  test("should swap the parent: from root to root", () => {
    const target = createShape(getCommonStruct, "rectangle", {
      id: "target",
      findex: "aF",
    });

    const shapes = [first, group0, child0, child1, child2, target, last];
    const composite = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });
    expect(swapShapeParent(composite, target.id, group0.id, "above", () => "")).toEqual({
      update: { [target.id]: { findex: "a9V" } },
    });
    expect(swapShapeParent(composite, target.id, last.id, "below", () => "")).toEqual({
      update: { [target.id]: { findex: "aa" } },
    });
  });

  test("should swap the parent: create new group", () => {
    const target = createShape(getCommonStruct, "rectangle", {
      id: "target",
      findex: "aF",
    });

    const shapes = [first, group0, child0, child1, child2, target, last];
    const composite = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });
    expect(swapShapeParent(composite, target.id, child0.id, "group", () => "new")).toEqual({
      add: [createShape(getCommonStruct, "group", { id: "new", parentId: child0.parentId, findex: child0.findex })],
      update: {
        [child0.id]: { parentId: "new", findex: "a0" },
        [target.id]: { parentId: "new", findex: "a1" },
      },
    });
  });

  test("should swap the parent: become a child of a group", () => {
    const target = createShape(getCommonStruct, "rectangle", {
      id: "target",
      findex: "aF",
    });
    const empty = createShape(getCommonStruct, "group", {
      id: "empty",
      findex: "aG",
    });

    const shapes = [first, group0, child0, child1, child2, target, empty, last];
    const composite = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });
    expect(
      swapShapeParent(composite, target.id, empty.id, "group", () => ""),
      "to empty group",
    ).toEqual({
      update: {
        [target.id]: { parentId: empty.id },
      },
    });

    expect(
      swapShapeParent(composite, target.id, group0.id, "group", () => ""),
      "to a group having children",
    ).toEqual({
      update: {
        [target.id]: { parentId: group0.id, findex: "aE" },
      },
    });

    expect(
      swapShapeParent(composite, target.id, empty.id, "adopt", () => ""),
      "to empty group",
    ).toEqual({
      update: {
        [target.id]: { parentId: empty.id },
      },
    });

    expect(
      swapShapeParent(composite, target.id, group0.id, "adopt", () => ""),
      "to a group having children",
    ).toEqual({
      update: {
        [target.id]: { parentId: group0.id, findex: "aE" },
      },
    });
  });

  test("should delete the original group when it no longer has children", () => {
    const group1 = createShape(getCommonStruct, "group", { id: "group1", findex: "aE" });
    const target = createShape(getCommonStruct, "rectangle", {
      id: "target",
      findex: "aF",
      parentId: group1.id,
    });

    const shapes = [group0, child0, child1, child2, group1, target];
    const composite = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });
    expect(swapShapeParent(composite, target.id, child0.id, "above", () => "")).toEqual({
      update: { [target.id]: { parentId: group0.id, findex: "aA" } },
      delete: [group1.id],
    });
  });

  test("should return empty patch when nothing changes", () => {
    const shapes = [first, group0, child0, child1, child2, last];
    const composite = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    expect(swapShapeParent(composite, first.id, first.id, "above", () => "")).toEqual({});
    expect(swapShapeParent(composite, first.id, group0.id, "above", () => "")).toEqual({});
    expect(swapShapeParent(composite, last.id, group0.id, "below", () => "")).toEqual({});
    expect(swapShapeParent(composite, child1.id, child2.id, "above", () => "")).toEqual({});
    expect(swapShapeParent(composite, child2.id, child1.id, "below", () => "")).toEqual({});
    expect(swapShapeParent(composite, child2.id, group0.id, "adopt", () => "")).toEqual({});
    expect(swapShapeParent(composite, child2.id, group0.id, "group", () => "")).toEqual({});
  });
});

describe("getAllShapeRangeWithinComposite", () => {
  test("should return the range accommodate all shapes", () => {
    const rect0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "rect0",
      p: { x: 10, y: 10 },
      width: 100,
      height: 100,
    });
    const rect1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "rect1",
      p: { x: 210, y: 210 },
      width: 100,
      height: 100,
    });

    expect(
      getAllShapeRangeWithinComposite(newShapeComposite({ shapes: [rect0], getStruct: getCommonStruct })),
    ).toEqualRect({ x: 10, y: 10, width: 100, height: 100 });
    expect(
      getAllShapeRangeWithinComposite(newShapeComposite({ shapes: [rect1], getStruct: getCommonStruct })),
    ).toEqualRect({ x: 210, y: 210, width: 100, height: 100 });
    expect(
      getAllShapeRangeWithinComposite(newShapeComposite({ shapes: [rect0, rect1], getStruct: getCommonStruct })),
    ).toEqualRect({ x: 10, y: 10, width: 300, height: 300 });
  });
});
