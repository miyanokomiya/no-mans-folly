import { describe, test, expect } from "vitest";
import { canAttendToAlignBox, getModifiedAlignRootIds, getNextAlignLayout, newAlignBoxHandler } from "./alignHandler";
import { createShape, getCommonStruct } from "../shapes";
import { AlignBoxShape } from "../shapes/align/alignBox";
import { RectangleShape } from "../shapes/rectangle";
import { getNextShapeComposite, newShapeComposite } from "./shapeComposite";
import { EntityPatchInfo, Shape } from "../models";
import { TextShape } from "../shapes/text";

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

describe("newAlignBoxHandler", () => {
  describe("getModifiedPadding", () => {
    const shapeComposite = newShapeComposite({
      shapes: [box0, rect0, rect1, box10, rect10, rect11, box20],
      getStruct: getCommonStruct,
    });
    const target = newAlignBoxHandler({
      getShapeComposite: () => shapeComposite,
      alignBoxId: box0.id,
    });

    test("should return modified padding: top", () => {
      expect(target.getModifiedPadding("padding-top", { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual(undefined);
      expect(target.getModifiedPadding("padding-top", { x: 0, y: 0 }, { x: 0, y: 10 })).toEqual([10, 0, 0, 0]);
      expect(target.getModifiedPadding("padding-top", { x: 0, y: 0 }, { x: 0, y: 10 }, { bothSides: true })).toEqual([
        10, 0, 10, 0,
      ]);
      expect(target.getModifiedPadding("padding-top", { x: 0, y: 0 }, { x: 0, y: 10 }, { allSides: true })).toEqual([
        10, 10, 10, 10,
      ]);
    });

    test("should return modified padding: right", () => {
      expect(target.getModifiedPadding("padding-right", { x: 0, y: 0 }, { x: 0, y: 10 })).toEqual(undefined);
      expect(target.getModifiedPadding("padding-right", { x: 0, y: 0 }, { x: -10, y: 0 })).toEqual([0, 10, 0, 0]);
      expect(target.getModifiedPadding("padding-right", { x: 0, y: 0 }, { x: -10, y: 0 }, { bothSides: true })).toEqual(
        [0, 10, 0, 10],
      );
      expect(target.getModifiedPadding("padding-right", { x: 0, y: 0 }, { x: -10, y: 0 }, { allSides: true })).toEqual([
        10, 10, 10, 10,
      ]);
    });

    test("should return modified padding: bottom", () => {
      expect(target.getModifiedPadding("padding-bottom", { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual(undefined);
      expect(target.getModifiedPadding("padding-bottom", { x: 0, y: 0 }, { x: 0, y: -10 })).toEqual([0, 0, 10, 0]);
      expect(
        target.getModifiedPadding("padding-bottom", { x: 0, y: 0 }, { x: 0, y: -10 }, { bothSides: true }),
      ).toEqual([10, 0, 10, 0]);
      expect(target.getModifiedPadding("padding-bottom", { x: 0, y: 0 }, { x: 0, y: -10 }, { allSides: true })).toEqual(
        [10, 10, 10, 10],
      );
    });

    test("should return modified padding: left", () => {
      expect(target.getModifiedPadding("padding-left", { x: 0, y: 0 }, { x: 0, y: 10 })).toEqual(undefined);
      expect(target.getModifiedPadding("padding-left", { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual([0, 0, 0, 10]);
      expect(target.getModifiedPadding("padding-left", { x: 0, y: 0 }, { x: 10, y: 0 }, { bothSides: true })).toEqual([
        0, 10, 0, 10,
      ]);
      expect(target.getModifiedPadding("padding-left", { x: 0, y: 0 }, { x: 10, y: 0 }, { allSides: true })).toEqual([
        10, 10, 10, 10,
      ]);
    });
  });

  describe("getModifiedGap", () => {
    const shapeComposite = newShapeComposite({
      shapes: [box0, rect0, rect1, box10, rect10, rect11, box20],
      getStruct: getCommonStruct,
    });
    const target = newAlignBoxHandler({
      getShapeComposite: () => shapeComposite,
      alignBoxId: box0.id,
    });

    test("should return modified gap: row", () => {
      expect(target.getModifiedGap("gap-r", { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual(undefined);
      expect(target.getModifiedGap("gap-r", { x: 0, y: 0 }, { x: 0, y: 50 })).toEqual({ x: 10, y: 60 });
      expect(target.getModifiedGap("gap-r", { x: 0, y: 0 }, { x: 0, y: 50 }, { both: true })).toEqual({ x: 60, y: 60 });
      expect(target.getModifiedGap("gap-r", { x: 0, y: 0 }, { x: 0, y: -50 })).toEqual({ x: 10, y: 0 });
    });

    test("should return modified gap: column", () => {
      expect(target.getModifiedGap("gap-c", { x: 0, y: 0 }, { x: 0, y: 10 })).toEqual(undefined);
      expect(target.getModifiedGap("gap-c", { x: 0, y: 0 }, { x: 50, y: 0 })).toEqual({ x: 60, y: 10 });
      expect(target.getModifiedGap("gap-c", { x: 0, y: 0 }, { x: 50, y: 0 }, { both: true })).toEqual({ x: 60, y: 60 });
      expect(target.getModifiedGap("gap-c", { x: 0, y: 0 }, { x: -50, y: 0 })).toEqual({ x: 0, y: 10 });
    });
  });
});

describe("getNextAlignLayout", () => {
  test("should return patch to update align shapes", () => {
    const shapeComposite = newShapeComposite({
      shapes: [box0, rect0, rect1, box10, rect10, rect11, box20],
      getStruct: getCommonStruct,
    });
    const result = getNextAlignLayout(shapeComposite, box0.id);
    expect(result[box0.id]).toEqual({ width: 30 });
    expect(result).not.toHaveProperty(rect0.id);
    expect(result).toHaveProperty(rect1.id);
  });

  test("should apply root rotation to all shapes", () => {
    const shapeComposite = newShapeComposite({
      shapes: [
        { ...box0, rotation: Math.PI },
        rect0,
        { ...rect1, rotation: Math.PI / 2 },
        box10,
        rect10,
        rect11,
        box20,
      ],
      getStruct: getCommonStruct,
    });
    const result = getNextAlignLayout(shapeComposite, box0.id);
    expect(result[rect0.id].rotation).toBeCloseTo(Math.PI);
    expect(result[rect1.id].rotation).toBeCloseTo(Math.PI);
  });

  test("should translate all children when a shape has ones", () => {
    const group0 = createShape(getCommonStruct, "group", { id: "group0", parentId: box0.id });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
      width: 30,
      height: 30,
    });
    const shapeComposite = newShapeComposite({
      shapes: [box0, rect0, group0, child0],
      getStruct: getCommonStruct,
    });
    const result = getNextAlignLayout(shapeComposite, box0.id);
    expect(result[group0.id]).toEqual({ p: { x: 0, y: 40 } });
    expect(result[child0.id]).toEqual({ p: { x: 0, y: 40 } });
  });

  test("should take care of group shape's position", () => {
    const group0 = createShape(getCommonStruct, "group", {
      id: "group0",
      parentId: box0.id,
    });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
      width: 10,
      height: 20,
    });
    const shapeComposite = newShapeComposite({
      shapes: [box0, rect0, rect1, group0, child0],
      getStruct: getCommonStruct,
    });
    const result = getNextAlignLayout(shapeComposite, box0.id);
    expect(result).toHaveProperty(group0.id);
    expect(result[child0.id]).toEqual({ p: { x: 0, y: 80 } });
  });
});

describe("getModifiedAlignRootIds", () => {
  test("should return related align box shapes: swap parent", () => {
    const patchInfo: EntityPatchInfo<Shape> = {
      update: { rect0: { parentId: box10.id } },
    };
    const srcComposite = newShapeComposite({
      shapes: [box0, rect0, rect1, box10, rect10, rect11, box20],
      getStruct: getCommonStruct,
    });
    const updatedComposite = getNextShapeComposite(srcComposite, patchInfo);
    expect(getModifiedAlignRootIds(srcComposite, updatedComposite, patchInfo)).toEqual([box0.id, box10.id]);
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
    expect(getModifiedAlignRootIds(srcComposite, updatedComposite, patchInfo)).toEqual([box0.id]);
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
    expect(getModifiedAlignRootIds(srcComposite, updatedComposite, patchInfo)).toEqual([box0.id]);
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
    expect(getModifiedAlignRootIds(srcComposite, updatedComposite, patchInfo)).toEqual([box0.id]);
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
    expect(getModifiedAlignRootIds(srcComposite, updatedComposite, patchInfo)).toEqual([box0.id, box10.id]);
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
    expect(getModifiedAlignRootIds(srcComposite, updatedComposite, patchInfo)).toEqual([box0.id]);
  });
});

describe("canAttendToAlignBox", () => {
  test("should return true when a shape can attend to align box", () => {
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
    const shapeComposite = newShapeComposite({
      shapes: [rect0, line0, label0, group0, child0, child1, align, align_child],
      getStruct: getCommonStruct,
    });
    expect(canAttendToAlignBox(shapeComposite, rect0)).toBe(true);
    expect(canAttendToAlignBox(shapeComposite, line0)).toBe(false);
    expect(canAttendToAlignBox(shapeComposite, label0)).toBe(false);
    expect(canAttendToAlignBox(shapeComposite, group0)).toBe(true);
    expect(canAttendToAlignBox(shapeComposite, child0), "child of group shape").toBe(false);
    expect(canAttendToAlignBox(shapeComposite, child1), "child of missing shape").toBe(true);
    expect(canAttendToAlignBox(shapeComposite, align_child), "child of align box shape").toBe(true);
  });
});
