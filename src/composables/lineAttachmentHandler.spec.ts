import { describe, test, expect } from "vitest";
import { getLineAttachmentPatch, patchByMoveToAttachedPoint } from "./lineAttachmentHandler";
import { newShapeComposite } from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { LineShape } from "../shapes/line";

describe("getLineAttachmentPatch", () => {
  test("should return shape patch to move shapes to the attached points", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", { id: "line", q: { x: 100, y: 0 } });
    const shapeA = createShape(getCommonStruct, "rectangle", { id: "a" });
    const shapeB = createShape(getCommonStruct, "rectangle", {
      id: "b",
      attachment: {
        id: line.id,
        to: { x: 0.2, y: 0 },
        anchor: { x: 0.5, y: 0.5 },
        rotationType: "relative",
        rotation: 0,
      },
    });
    const shapeComposite = newShapeComposite({
      shapes: [line, shapeA, shapeB],
      getStruct: getCommonStruct,
    });
    const result0 = getLineAttachmentPatch(shapeComposite, {
      update: {
        [line.id]: { q: { x: 0, y: 100 } } as Partial<LineShape>,
      },
    });
    expect(result0).toEqual({
      [shapeB.id]: {
        p: { x: -50, y: -30 },
      },
    });
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
