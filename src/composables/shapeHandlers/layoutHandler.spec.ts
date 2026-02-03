import { describe, test, expect } from "vitest";
import { createShape, getCommonStruct } from "../../shapes";
import { TextShape } from "../../shapes/text";
import { getNextShapeComposite, newShapeComposite } from "../shapeComposite";
import {
  canJoinGeneralLayout,
  canShapesJoinGeneralLayout,
  getModifiedLayoutIdsInOrder,
  getModifiedLayoutRootIds,
} from "./layoutHandler";
import { EntityPatchInfo, Shape } from "../../models";
import { AlignBoxShape, isAlignBoxShape } from "../../shapes/align/alignBox";
import { RectangleShape } from "../../shapes/rectangle";
import { isTableShape } from "../../shapes/table/table";

describe("canJoinAlignBox / canShapesJoinAlignBox", () => {
  const rect0 = createShape(getCommonStruct, "rectangle", {
    id: "rect0",
  });
  const line0 = createShape(getCommonStruct, "line", {
    id: "line0",
  });
  const label0 = createShape<TextShape>(getCommonStruct, "text", {
    id: "label0",
    parentId: line0.id,
    lineAttached: 0.5,
  });
  const group0 = createShape(getCommonStruct, "group", {
    id: "group0",
  });
  const child0 = createShape(getCommonStruct, "rectangle", {
    id: "child0",
    parentId: group0.id,
  });
  const child1 = createShape(getCommonStruct, "rectangle", {
    id: "child1",
    parentId: "unknown",
  });
  const align = createShape(getCommonStruct, "align_box", {
    id: "align",
  });
  const align_child = createShape(getCommonStruct, "rectangle", {
    id: "align_child",
    parentId: align.id,
  });
  const treeRoot = createShape(getCommonStruct, "tree_root", {
    id: "treeRoot",
  });
  const treeNode = createShape(getCommonStruct, "tree_node", {
    id: "treeNode",
    parentId: treeRoot.id,
  });
  const frame = createShape(getCommonStruct, "frame", {
    id: "frame",
  });
  const frameAlignGroup = createShape(getCommonStruct, "frame_align_group", {
    id: "frameAlignGroup",
  });
  const vnnode = createShape(getCommonStruct, "vn_node", {
    id: "vnnode",
  });
  const shapeComposite = newShapeComposite({
    shapes: [
      rect0,
      line0,
      label0,
      group0,
      child0,
      child1,
      align,
      align_child,
      treeRoot,
      treeNode,
      frame,
      frameAlignGroup,
      vnnode,
    ],
    getStruct: getCommonStruct,
  });

  test("canJoinAlignBox: should return true when a shape can attend to align box", () => {
    expect(canJoinGeneralLayout(shapeComposite, rect0)).toBe(true);
    expect(canJoinGeneralLayout(shapeComposite, line0)).toBe(false);
    expect(canJoinGeneralLayout(shapeComposite, label0)).toBe(false);
    expect(canJoinGeneralLayout(shapeComposite, group0)).toBe(true);
    expect(canJoinGeneralLayout(shapeComposite, child0), "child of group shape").toBe(true);
    expect(canJoinGeneralLayout(shapeComposite, child1), "child of missing shape").toBe(true);
    expect(canJoinGeneralLayout(shapeComposite, align_child), "child of align box shape").toBe(true);
    expect(canJoinGeneralLayout(shapeComposite, treeRoot)).toBe(true);
    expect(canJoinGeneralLayout(shapeComposite, treeNode), "child of tree root shape").toBe(false);
    expect(canJoinGeneralLayout(shapeComposite, frame)).toBe(false);
    expect(canJoinGeneralLayout(shapeComposite, frameAlignGroup)).toBe(false);
    expect(canJoinGeneralLayout(shapeComposite, vnnode)).toBe(false);
  });

  test("canShapesJoinAlignBox: should return true when all shapes can attend to align box", () => {
    expect(canShapesJoinGeneralLayout(shapeComposite, [rect0, line0]), "invalid shape type").toBe(false);
    expect(canShapesJoinGeneralLayout(shapeComposite, [rect0, label0]), "different parents").toBe(false);
    expect(canShapesJoinGeneralLayout(shapeComposite, [rect0, group0])).toBe(true);
    expect(canShapesJoinGeneralLayout(shapeComposite, [rect0, child0]), "different parents").toBe(false);
    expect(canShapesJoinGeneralLayout(shapeComposite, [rect0, child1])).toBe(true);
    expect(canShapesJoinGeneralLayout(shapeComposite, [child0, align_child]), "different parents").toBe(false);
    expect(canShapesJoinGeneralLayout(shapeComposite, [align_child])).toBe(true);
  });
});

describe("getModifiedLayoutRootIds", () => {
  const box0 = createShape<AlignBoxShape>(getCommonStruct, "align_box", {
    id: "box0",
    height: 100,
    direction: 0,
    gapR: 10,
    gapC: 10,
    baseWidth: undefined,
  });
  const rect0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "rect0",
    parentId: box0.id,
    width: 30,
    height: 30,
  });
  const rect1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "rect1",
    parentId: box0.id,
    width: 30,
    height: 30,
  });
  const box10 = createShape<AlignBoxShape>(getCommonStruct, "align_box", {
    id: "box10",
    height: 100,
    direction: 0,
    gapR: 10,
    gapC: 10,
    baseWidth: undefined,
  });
  const rect10 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "rect10",
    parentId: box10.id,
    width: 30,
    height: 30,
  });
  const rect11 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "rect11",
    parentId: box10.id,
    width: 30,
    height: 30,
  });
  const box20 = createShape<AlignBoxShape>(getCommonStruct, "align_box", {
    id: "box20",
    height: 100,
    direction: 0,
    gapR: 10,
    gapC: 10,
    baseWidth: undefined,
  });
  test("should return related align box shapes: swap parent", () => {
    const patchInfo: EntityPatchInfo<Shape> = {
      update: { rect0: { parentId: box10.id } },
    };
    const srcComposite = newShapeComposite({
      shapes: [box0, rect0, rect1, box10, rect10, rect11, box20],
      getStruct: getCommonStruct,
    });
    const updatedComposite = getNextShapeComposite(srcComposite, patchInfo);
    expect(getModifiedLayoutRootIds(srcComposite, updatedComposite, patchInfo, isAlignBoxShape)).toEqual([
      box0.id,
      box10.id,
    ]);
  });

  test("should return related align box shapes: leave from a box", () => {
    const patchInfo: EntityPatchInfo<Shape> = {
      update: { rect0: { parentId: undefined } },
    };
    const srcComposite = newShapeComposite({
      shapes: [box0, rect0, rect1, box10, rect10, rect11, box20],
      getStruct: getCommonStruct,
    });
    const updatedComposite = getNextShapeComposite(srcComposite, patchInfo);
    expect(getModifiedLayoutRootIds(srcComposite, updatedComposite, patchInfo, isAlignBoxShape)).toEqual([box0.id]);
  });

  test("should return related align box shapes: nested boxes", () => {
    const patchInfo: EntityPatchInfo<Shape> = {
      update: { rect10: { findex: "a" } },
    };
    const srcComposite = newShapeComposite({
      shapes: [box0, rect0, rect1, { ...box10, parentId: box0.id }, rect10, rect11, box20],
      getStruct: getCommonStruct,
    });
    const updatedComposite = getNextShapeComposite(srcComposite, patchInfo);
    expect(getModifiedLayoutRootIds(srcComposite, updatedComposite, patchInfo, isAlignBoxShape)).toEqual([box0.id]);
  });

  test("should not return a box id when it becomes a child of other board", () => {
    const patchInfo: EntityPatchInfo<Shape> = {
      update: { box10: { parentId: box0.id } },
    };
    const srcComposite = newShapeComposite({
      shapes: [box0, rect0, rect1, box10, rect10, rect11, box20],
      getStruct: getCommonStruct,
    });
    const updatedComposite = getNextShapeComposite(srcComposite, patchInfo);
    expect(getModifiedLayoutRootIds(srcComposite, updatedComposite, patchInfo, isAlignBoxShape)).toEqual([box0.id]);
  });

  test("should return related align box shapes: add and delete children", () => {
    const patchInfo: EntityPatchInfo<Shape> = {
      add: [rect1],
      delete: [rect11.id],
    };
    const srcComposite = newShapeComposite({
      shapes: [box0, rect0, box10, rect10, rect11, box20],
      getStruct: getCommonStruct,
    });
    const updatedComposite = getNextShapeComposite(srcComposite, patchInfo);
    expect(getModifiedLayoutRootIds(srcComposite, updatedComposite, patchInfo, isAlignBoxShape)).toEqual([
      box0.id,
      box10.id,
    ]);
  });

  test("should return related align box shapes: add and delete boxes", () => {
    const patchInfo: EntityPatchInfo<Shape> = {
      add: [box0, rect0],
      delete: [box10.id],
    };
    const srcComposite = newShapeComposite({
      shapes: [box10, rect10, rect11, box20],
      getStruct: getCommonStruct,
    });
    const updatedComposite = getNextShapeComposite(srcComposite, patchInfo);
    expect(getModifiedLayoutRootIds(srcComposite, updatedComposite, patchInfo, isAlignBoxShape)).toEqual([box0.id]);
  });
});

describe("getModifiedLayoutIdsInOrder", () => {
  const box0 = createShape<AlignBoxShape>(getCommonStruct, "align_box", {
    id: "box0",
    height: 100,
    direction: 0,
    gapR: 10,
    gapC: 10,
    baseWidth: undefined,
  });
  const rect0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "rect0",
    parentId: box0.id,
    width: 30,
    height: 30,
  });
  const rect1 = { ...rect0, id: "rect1" };
  const box01 = { ...box0, id: "box01", parentId: box0.id };
  const rect00 = { ...rect0, id: "rect00", parentId: box01.id };
  const rect9 = { ...rect0, id: "rect9", parentId: undefined };

  const shapeComposite = newShapeComposite({
    shapes: [box0, rect0, rect1, box01, rect00, rect9],
    getStruct: getCommonStruct,
  });

  function isLayoutShape(s: Shape): boolean {
    return isAlignBoxShape(s) || isTableShape(s);
  }

  test("should return modified layout ids: update entity", () => {
    const patchInfo: EntityPatchInfo<Shape> = {
      update: {
        [rect00.id]: { width: 50 } as Partial<RectangleShape>,
      },
    };
    const nextComposite = getNextShapeComposite(shapeComposite, patchInfo);
    expect(getModifiedLayoutIdsInOrder(shapeComposite, nextComposite, patchInfo, isLayoutShape)).toEqual([
      [box01.id],
      [box0.id],
    ]);
  });

  test("should return modified layout ids: update box", () => {
    const patchInfo: EntityPatchInfo<Shape> = {
      update: {
        [box01.id]: { p: { x: 100, y: 0 } },
      },
    };
    const nextComposite = getNextShapeComposite(shapeComposite, patchInfo);
    expect(getModifiedLayoutIdsInOrder(shapeComposite, nextComposite, patchInfo, isLayoutShape)).toEqual([
      [box01.id],
      [box0.id],
    ]);
  });

  test("should return modified layout ids: add", () => {
    const rect01 = { ...rect00, id: "rect01" };
    const patchInfo: EntityPatchInfo<Shape> = {
      add: [rect01],
    };
    const nextComposite = getNextShapeComposite(shapeComposite, patchInfo);
    expect(getModifiedLayoutIdsInOrder(shapeComposite, nextComposite, patchInfo, isLayoutShape)).toEqual([
      [box01.id],
      [box0.id],
    ]);
  });

  test("should return modified layout ids: delete entity", () => {
    const patchInfo: EntityPatchInfo<Shape> = {
      delete: [rect00.id],
    };
    const nextComposite = getNextShapeComposite(shapeComposite, patchInfo);
    expect(getModifiedLayoutIdsInOrder(shapeComposite, nextComposite, patchInfo, isLayoutShape)).toEqual([
      [box01.id],
      [box0.id],
    ]);
  });

  test("should return modified layout ids: delete box", () => {
    const patchInfo: EntityPatchInfo<Shape> = {
      delete: [box01.id],
    };
    const nextComposite = getNextShapeComposite(shapeComposite, patchInfo);
    expect(getModifiedLayoutIdsInOrder(shapeComposite, nextComposite, patchInfo, isLayoutShape)).toEqual([[box0.id]]);
  });

  describe("should regard bidirectional layout", () => {
    const box02 = { ...box0, id: "box02", parentId: box0.id, lcV: 1 as const };
    const rect02 = { ...rect0, id: "rect02", parentId: box02.id };
    const box020 = { ...box0, id: "box020", parentId: box02.id, lcH: 1 as const };
    const box021 = { ...box0, id: "box021", parentId: box02.id };
    const shapeComposite = newShapeComposite({
      shapes: [box0, box01, rect00, box02, rect02, box020, box021],
      getStruct: getCommonStruct,
    });

    test("should pick all layout shapes that can be affected by their layout parent shapes", () => {
      const patchInfo: EntityPatchInfo<Shape> = {
        update: {
          [box0.id]: { p: { x: 100, y: 0 } },
        },
      };
      const nextComposite = getNextShapeComposite(shapeComposite, patchInfo);
      expect(
        getModifiedLayoutIdsInOrder(shapeComposite, nextComposite, patchInfo, isLayoutShape, isAlignBoxShape),
      ).toEqual([[box020.id], [box02.id], [box0.id]]);
    });
  });

  test("should return modified layout ids: make entity child", () => {
    const patchInfo: EntityPatchInfo<Shape> = {
      update: {
        [rect9.id]: { parentId: box01.id },
      },
    };
    const nextComposite = getNextShapeComposite(shapeComposite, patchInfo);
    expect(getModifiedLayoutIdsInOrder(shapeComposite, nextComposite, patchInfo, isLayoutShape)).toEqual([
      [box01.id],
      [box0.id],
    ]);
  });
});
