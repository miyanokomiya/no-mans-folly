import { describe, test, expect } from "vitest";
import {
  getAttachmentAnchorPoint,
  getClosestAnchorAtCenter,
  getLineAttachmentPatch,
  patchByMoveToAttachedPoint,
} from "./lineAttachmentHandler";
import { newShapeComposite } from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { LineShape } from "../shapes/line";
import { RectangleShape } from "../shapes/rectangle";
import { Shape } from "../models";

describe("getLineAttachmentPatch", () => {
  const line = createShape<LineShape>(getCommonStruct, "line", { id: "line", q: { x: 100, y: 0 } });
  const shapeA = createShape(getCommonStruct, "rectangle", {
    id: "a",
    attachment: {
      id: line.id,
      to: { x: 0.2, y: 0 },
      anchor: { x: 0.5, y: 0.5 },
      rotationType: "absolute",
      rotation: Math.PI / 2,
    },
  });
  const shapeB = createShape(getCommonStruct, "rectangle", {
    id: "b",
    attachment: {
      id: line.id,
      to: { x: 0.2, y: 0 },
      anchor: { x: 0.5, y: 0.5 },
      rotationType: "relative",
      rotation: Math.PI / 2,
    },
  });

  test("should return shape patch to move shapes to the attached points", () => {
    const shapeComposite = newShapeComposite({
      shapes: [line, shapeA, shapeB],
      getStruct: getCommonStruct,
    });

    const result0 = getLineAttachmentPatch(shapeComposite, {
      update: {
        [line.id]: { q: { x: 0, y: 100 } } as Partial<LineShape>,
      },
    });
    expect(result0[shapeA.id].p).toEqualPoint({ x: -50, y: -30 });
    expect(result0[shapeA.id]).not.toHaveProperty("rotation");
    expect(result0[shapeB.id].p).toEqualPoint({ x: -50, y: -30 });
    expect(result0[shapeB.id].rotation).toBeCloseTo(Math.PI);

    const result1 = getLineAttachmentPatch(shapeComposite, {
      update: {
        [shapeB.id]: { width: 200 } as Partial<RectangleShape>,
      },
    });
    expect(result1).not.toHaveProperty(shapeA.id);
    expect(result1[shapeB.id].p).toEqualPoint({ x: -80, y: -50 });
    expect(result1[shapeB.id].rotation).toBeCloseTo(Math.PI / 2);
  });

  test("should clear attachment when attached line is missing", () => {
    const shapeComposite = newShapeComposite({
      shapes: [shapeA, shapeB],
      getStruct: getCommonStruct,
    });

    const result1 = getLineAttachmentPatch(shapeComposite, {
      update: {
        [shapeB.id]: { width: 200 } as Partial<RectangleShape>,
      },
    });
    expect(result1[shapeB.id]).toHaveProperty("attachment");
    expect(result1[shapeB.id].attachment).toBe(undefined);
  });
});

describe("patchByMoveToAttachedPoint", () => {
  test("should return shape patch to move to the point", () => {
    const shape = createShape(getCommonStruct, "rectangle", { id: "a" });
    const shapeComposite = newShapeComposite({
      shapes: [shape],
      getStruct: getCommonStruct,
    });

    const result0 = patchByMoveToAttachedPoint(shapeComposite, shape, { x: 0.5, y: 0.5 }, { x: 100, y: 100 });
    expect(result0?.p).toEqualPoint({ x: 50, y: 50 });

    const result1 = patchByMoveToAttachedPoint(shapeComposite, shape, { x: 0.2, y: 0.8 }, { x: 100, y: 100 });
    expect(result1?.p).toEqualPoint({ x: 80, y: 20 });
  });
});

describe("getAttachmentAnchorPoint", () => {
  test("should return initial anchor point when the shape doesn't have attachment", () => {
    const shape = createShape(getCommonStruct, "rectangle", { id: "a" });
    const shapeComposite = newShapeComposite({
      shapes: [shape],
      getStruct: getCommonStruct,
    });
    expect(getAttachmentAnchorPoint(shapeComposite, shape)).toEqualPoint({ x: 50, y: 50 });
  });

  test("should return anchor point when the shape have attachment", () => {
    const shape = createShape(getCommonStruct, "rectangle", {
      id: "a",
      attachment: {
        id: "line",
        to: { x: 0.2, y: 0 },
        anchor: { x: 0.3, y: 0.6 },
        rotationType: "relative",
        rotation: 0,
      },
    });
    const shapeComposite = newShapeComposite({
      shapes: [shape],
      getStruct: getCommonStruct,
    });
    expect(getAttachmentAnchorPoint(shapeComposite, shape)).toEqualPoint({ x: 30, y: 60 });
  });
});

describe("getClosestAnchorAtCenter", () => {
  const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 100, height: 200 });
  test("should return closest anchor candidate to the point", () => {
    const shapeComposite = newShapeComposite({
      shapes: [shape],
      getStruct: getCommonStruct,
    });
    expect(getClosestAnchorAtCenter(shapeComposite, shape, { x: 50, y: 50 })).toEqualPoint({ x: 0.5, y: 0.75 });
  });

  test("should slide the next anchor based on current one", () => {
    const shape1 = {
      ...shape,
      attachment: {
        id: "a",
        to: { x: 0, y: 0 },
        anchor: { x: 1, y: 1 },
        rotationType: "relative",
        rotation: 0,
      },
    } as Shape;
    const shapeComposite = newShapeComposite({
      shapes: [shape1],
      getStruct: getCommonStruct,
    });
    expect(getClosestAnchorAtCenter(shapeComposite, shape1, { x: 50, y: 50 })).toEqualPoint({ x: 1, y: 1 });
    expect(getClosestAnchorAtCenter(shapeComposite, shape1, { x: 80, y: 150 })).toEqualPoint({ x: 0.7, y: 0.75 });
  });
});
