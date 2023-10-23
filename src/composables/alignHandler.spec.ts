import { describe, test, expect } from "vitest";
import { getModifiedAlignRootIds, getNextAlignLayout } from "./alignHandler";
import { createShape, getCommonStruct } from "../shapes";
import { AlignBoxShape } from "../shapes/align/alignBox";
import { RectangleShape } from "../shapes/rectangle";
import { getNextShapeComposite, newShapeComposite } from "./shapeComposite";
import { EntityPatchInfo, Shape } from "../models";

const box0 = createShape<AlignBoxShape>(getCommonStruct, "align_box", {
  id: "box0",
  height: 100,
  direction: 0,
  gap: 10,
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
  gap: 10,
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
  gap: 10,
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
