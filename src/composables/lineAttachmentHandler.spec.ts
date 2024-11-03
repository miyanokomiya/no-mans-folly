import { describe, test, expect } from "vitest";
import {
  getAttachmentAnchorPoint,
  getClosestAnchorAtCenter,
  getEvenlySpacedLineAttachment,
  getEvenlySpacedLineAttachmentBetweenFixedOnes,
  getLineAttachmentPatch,
  patchByMoveToAttachedPoint,
} from "./lineAttachmentHandler";
import { newShapeComposite } from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { LineShape } from "../shapes/line";
import { RectangleShape } from "../shapes/rectangle";
import { Shape } from "../models";
import { getLineEdgeInfo } from "../shapes/utils/line";

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

    const rotated = { ...shape, rotation: Math.PI / 4 };
    const shapeComposite1 = newShapeComposite({
      shapes: [rotated],
      getStruct: getCommonStruct,
    });
    expect(getAttachmentAnchorPoint(shapeComposite1, rotated)).toEqualPoint({
      x: 21.715728,
      y: 64.142135,
    });
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

describe("getEvenlySpacedLineAttachmentBetweenFixedOnes", () => {
  const line = createShape<LineShape>(getCommonStruct, "line", { id: "line", q: { x: 100, y: 0 } });
  const a = createShape(getCommonStruct, "rectangle", {
    id: "a",
    attachment: {
      id: line.id,
      to: { x: 0.2, y: 0 },
      anchor: { x: 0.5, y: 0.5 },
      rotationType: "relative",
      rotation: 0,
    },
  });
  const b = {
    ...a,
    id: "b",
    attachment: { ...a.attachment, to: { x: 0.3, y: 0 } },
  } as Shape;
  const c = {
    ...a,
    id: "c",
    attachment: { ...a.attachment, to: { x: 0.4, y: 0 } },
  } as Shape;
  const d = {
    ...a,
    id: "d",
    attachment: { ...a.attachment, to: { x: 0.8, y: 0 } },
  } as Shape;
  const e = {
    ...a,
    id: "e",
    attachment: { ...a.attachment, to: { x: 0.9, y: 0 } },
  } as Shape;

  test("should slide with perserving distance", () => {
    const result0 = getEvenlySpacedLineAttachmentBetweenFixedOnes(
      { line, a, b, c, d, e },
      line.id,
      [a.id, b.id, c.id],
      a.id,
      0.5,
    );
    expect(result0.get(b.id)).toEqual([{ x: 0.6, y: 0 }]);
    expect(result0.get(c.id)).toEqual([{ x: 0.7, y: 0 }]);

    const result1 = getEvenlySpacedLineAttachmentBetweenFixedOnes(
      { line, a, b, c, d, e },
      line.id,
      [a.id, b.id, c.id],
      a.id,
      0.75,
    );
    expect(result1.get(b.id)).toEqual([{ x: 0.85, y: 0 }]);
    expect(result1.get(c.id)).toEqual([{ x: 0.95, y: 0 }]);

    const result2 = getEvenlySpacedLineAttachmentBetweenFixedOnes(
      { line, a, b, c, d, e },
      line.id,
      [a.id, b.id, c.id],
      a.id,
      0.85,
    );
    expect(result2.get(b.id)).toEqual([{ x: 0.95, y: 0 }]);
    expect(result2.get(c.id), "should be within 0-1").toEqual([{ x: 1, y: 0 }]);
  });

  test("should slide with perserving distance: index shape is at middle", () => {
    const result3 = getEvenlySpacedLineAttachmentBetweenFixedOnes(
      { line, a, b, c, d, e },
      line.id,
      [a.id, b.id, c.id],
      b.id,
      0.5,
    );
    expect(result3.get(a.id)).toEqual([{ x: 0.4, y: 0 }]);
    expect(result3.get(c.id)?.[0]).toEqualPoint({ x: 0.6, y: 0 });
  });

  test("should slide with perserving distance: index shape is at the end", () => {
    const result4 = getEvenlySpacedLineAttachmentBetweenFixedOnes(
      { line, a, b, c, d, e },
      line.id,
      [a.id, b.id, c.id],
      c.id,
      0.5,
    );
    expect(result4.get(a.id)).toEqual([{ x: 0.3, y: 0 }]);
    expect(result4.get(b.id)?.[0]).toEqualPoint({ x: 0.4, y: 0 });
  });

  test("should evenly align unattached ones", () => {
    const ua = { ...a, id: "ua", attachment: undefined };
    const ub = { ...a, id: "ub", attachment: undefined };
    const result0 = getEvenlySpacedLineAttachmentBetweenFixedOnes(
      { line, a, b, c, d, e, ua, ub },
      line.id,
      [a.id, b.id, ua.id, ub.id],
      a.id,
      0.5,
    );
    expect(result0.size).toBe(3);
    expect(result0.get(b.id)?.[0]).toEqualPoint({ x: 0.6, y: 0 });
    expect(result0.get(ua.id)?.[0]).toEqualPoint({ x: 0.66666666, y: 0 });
    expect(result0.get(ub.id)?.[0]).toEqualPoint({ x: 0.73333333, y: 0 });
  });
});

describe("getEvenlySpacedLineAttachment", () => {
  const line = createShape<LineShape>(getCommonStruct, "line", { id: "line", q: { x: 100, y: 0 } });
  const a = createShape(getCommonStruct, "rectangle", {
    id: "a",
    p: { x: -30, y: -50 },
    attachment: {
      id: line.id,
      to: { x: 0.2, y: 0 },
      anchor: { x: 0.5, y: 0.5 },
      rotationType: "relative",
      rotation: 0,
    },
  });
  const b = {
    ...a,
    p: { x: -20, y: -50 },
    id: "b",
    attachment: { ...a.attachment, to: { x: 0.3, y: 0 } },
  } as Shape;
  const c = {
    ...a,
    p: { x: -10, y: -50 },
    id: "c",
    attachment: { ...a.attachment, to: { x: 0.4, y: 0 } },
  } as Shape;
  const d = {
    ...a,
    p: { x: 3, y: -50 },
    id: "d",
    attachment: { ...a.attachment, to: { x: 0.8, y: 0 } },
  } as Shape;
  const e = {
    ...a,
    id: "e",
    p: { x: 40, y: -50 },
    attachment: { ...a.attachment, to: { x: 0.9, y: 0 } },
  } as Shape;

  test("should evenly align between other ones", () => {
    const result0 = getEvenlySpacedLineAttachment(
      { line, a, b, c, d, e },
      line.id,
      [a.id, b.id, c.id],
      a.id,
      { x: 50, y: 0 },
      getLineEdgeInfo(line),
    );
    expect(result0.attachInfoMap.size).toBe(5);
    expect(result0.attachInfoMap.get(a.id)?.[0]).toEqualPoint({ x: 0.5, y: 0 });
    expect(result0.attachInfoMap.get(b.id)?.[0]).toEqualPoint({ x: 0.75, y: 0 });
    expect(result0.attachInfoMap.get(c.id)?.[0]).toEqualPoint({ x: 1, y: 0 });
    expect(result0.attachInfoMap.get(d.id)?.[0]).toEqualPoint({ x: 0, y: 0 });
    expect(result0.attachInfoMap.get(e.id)?.[0]).toEqualPoint({ x: 0.25, y: 0 });
  });

  test("should evenly align between other ones: preserved the order of selected ones", () => {
    const result0 = getEvenlySpacedLineAttachment(
      { line, a, b, c, d, e },
      line.id,
      [a.id, b.id, c.id],
      b.id,
      { x: 50, y: 0 },
      getLineEdgeInfo(line),
    );
    expect(result0.attachInfoMap.size).toBe(5);
    expect(result0.attachInfoMap.get(a.id)?.[0]).toEqualPoint({ x: 0.25, y: 0 });
    expect(result0.attachInfoMap.get(b.id)?.[0]).toEqualPoint({ x: 0.5, y: 0 });
    expect(result0.attachInfoMap.get(c.id)?.[0]).toEqualPoint({ x: 0.75, y: 0 });
    expect(result0.attachInfoMap.get(d.id)?.[0]).toEqualPoint({ x: 0, y: 0 });
    expect(result0.attachInfoMap.get(e.id)?.[0]).toEqualPoint({ x: 1, y: 0 });
  });

  test("should evenly align between other ones: to the last", () => {
    const result0 = getEvenlySpacedLineAttachment(
      { line, a, b, c, d, e },
      line.id,
      [a.id, b.id, c.id],
      c.id,
      { x: 100, y: 0 },
      getLineEdgeInfo(line),
    );
    expect(result0.attachInfoMap.size).toBe(5);
    expect(result0.attachInfoMap.get(a.id)?.[0]).toEqualPoint({ x: 0.5, y: 0 });
    expect(result0.attachInfoMap.get(b.id)?.[0]).toEqualPoint({ x: 0.75, y: 0 });
    expect(result0.attachInfoMap.get(c.id)?.[0]).toEqualPoint({ x: 1, y: 0 });
    expect(result0.attachInfoMap.get(d.id)?.[0]).toEqualPoint({ x: 0, y: 0 });
    expect(result0.attachInfoMap.get(e.id)?.[0]).toEqualPoint({ x: 0.25, y: 0 });

    const result1 = getEvenlySpacedLineAttachment(
      { line, a, b, c, d, e },
      line.id,
      [a.id, b.id, c.id],
      a.id,
      { x: 100, y: 0 },
      getLineEdgeInfo(line),
    );
    expect(result1.attachInfoMap.size).toBe(5);
    expect(result1.attachInfoMap.get(a.id)?.[0]).toEqualPoint({ x: 0.5, y: 0 });
    expect(result1.attachInfoMap.get(b.id)?.[0]).toEqualPoint({ x: 0.75, y: 0 });
    expect(result1.attachInfoMap.get(c.id)?.[0]).toEqualPoint({ x: 1, y: 0 });
    expect(result1.attachInfoMap.get(d.id)?.[0]).toEqualPoint({ x: 0, y: 0 });
    expect(result1.attachInfoMap.get(e.id)?.[0]).toEqualPoint({ x: 0.25, y: 0 });
  });

  test("should evenly align between other ones: 2 items", () => {
    const result0 = getEvenlySpacedLineAttachment(
      { line, a, b },
      line.id,
      [b.id],
      b.id,
      { x: 60, y: 0 },
      getLineEdgeInfo(line),
    );
    expect(result0.attachInfoMap.size).toBe(2);
    expect(result0.attachInfoMap.get(a.id)?.[0]).toEqualPoint({ x: 0, y: 0 });
    expect(result0.attachInfoMap.get(b.id)?.[0]).toEqualPoint({ x: 1, y: 0 });

    const result1 = getEvenlySpacedLineAttachment(
      { line, a, b },
      line.id,
      [b.id],
      b.id,
      { x: 40, y: 0 },
      getLineEdgeInfo(line),
    );
    expect(result1.attachInfoMap.size).toBe(2);
    expect(result1.attachInfoMap.get(a.id)?.[0]).toEqualPoint({ x: 1, y: 0 });
    expect(result1.attachInfoMap.get(b.id)?.[0]).toEqualPoint({ x: 0, y: 0 });
  });
});
