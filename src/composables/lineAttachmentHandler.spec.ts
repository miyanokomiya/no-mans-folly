import { describe, test, expect } from "vitest";
import {
  getAffineByMoveToAttachedPoint,
  getAttachmentAnchorPoint,
  getEvenlySpacedLineAttachment,
  getEvenlySpacedLineAttachmentBetweenFixedOnes,
  getLineAttachmentPatch,
  getNextAttachmentAnchor,
  newPreserveAttachmentByShapeHandler,
  newPreserveAttachmentHandler,
  snapRectWithLineAttachment,
} from "./lineAttachmentHandler";
import { newShapeComposite } from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { LineShape } from "../shapes/line";
import { RectangleShape } from "../shapes/rectangle";
import { Shape } from "../models";
import { getLineEdgeInfo } from "../shapes/utils/line";
import { TreeNodeShape } from "../shapes/tree/treeNode";
import { SnappingResult } from "./shapeSnapping";

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
  const shapeC = createShape(getCommonStruct, "rectangle", {
    id: "c",
    attachment: {
      id: shapeB.id,
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

  test("should ignore attachments to non-line shapes", () => {
    const shapeComposite = newShapeComposite({
      shapes: [shapeA, shapeB, shapeC],
      getStruct: getCommonStruct,
    });

    const result1 = getLineAttachmentPatch(shapeComposite, {
      update: {
        [shapeB.id]: { width: 200 } as Partial<RectangleShape>,
      },
    });
    expect(result1[shapeB.id]).toBe(undefined);
    expect(result1[shapeC.id]).toBe(undefined);
  });

  test("should detach unattachable shapes", () => {
    const root = createShape(getCommonStruct, "tree_root", {
      id: "root",
    });
    const nodeA = createShape(getCommonStruct, "tree_node", {
      id: "nodeA",
      attachment: {
        id: line.id,
        to: { x: 0.2, y: 0 },
        anchor: { x: 0.5, y: 0 },
        rotationType: "relative",
        rotation: 0,
      },
    });
    const shapeComposite = newShapeComposite({
      shapes: [line, root, nodeA],
      getStruct: getCommonStruct,
    });

    const result0 = getLineAttachmentPatch(shapeComposite, {
      update: {
        [nodeA.id]: {
          treeParentId: root.id,
          parentId: root.id,
        } as Partial<TreeNodeShape>,
      },
    });
    expect(result0[nodeA.id]).toHaveProperty("attachment");
    expect(result0[nodeA.id].attachment).toBe(undefined);
  });

  test("case: rotated group shape", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      id: "line",
      body: [{ p: { x: 100, y: 0 } }],
      q: { x: 100, y: 100 },
    });
    const group = createShape(getCommonStruct, "group", {
      id: "group",
      attachment: {
        id: "line",
        to: { x: 0.2, y: 0 },
        anchor: { x: 0.5, y: 0 },
        rotationType: "relative",
        rotation: 0,
      },
    });
    const a = createShape(getCommonStruct, "rectangle", {
      id: "a",
      parentId: group.id,
      p: { x: 50, y: 50 },
    });
    const b = { ...a, id: "b", p: { x: -50, y: 50 } };
    const shapeComposite = newShapeComposite({
      shapes: [line, group, a, b],
      getStruct: getCommonStruct,
    });

    const result0 = getLineAttachmentPatch(shapeComposite, {
      update: {
        [group.id]: {},
      },
    });
    expect(result0[a.id].p).toEqualPoint({ x: 40, y: 0 });
    expect(result0[a.id]).not.toHaveProperty("rotation");
    expect(result0[b.id].p).toEqualPoint({ x: -60, y: 0 });
    expect(result0[b.id]).not.toHaveProperty("rotation");

    const result1 = getLineAttachmentPatch(shapeComposite, {
      update: {
        [group.id]: {
          attachment: {
            id: "line",
            to: { x: 0.8, y: 0 },
            anchor: { x: 0.5, y: 0 },
            rotationType: "relative",
            rotation: 0,
          },
        },
      },
    });
    expect(result1[a.id].p).toEqualPoint({ x: 0, y: 60 });
    expect(result1[a.id].rotation).toBeCloseTo(Math.PI / 2);
    expect(result1[b.id].p).toEqualPoint({ x: 0, y: -40 });
    expect(result1[b.id].rotation).toBeCloseTo(Math.PI / 2);
  });

  test("should ignore unexisting shapes", () => {
    const shapeComposite = newShapeComposite({
      shapes: [line, shapeA, shapeB],
      getStruct: getCommonStruct,
    });

    const result0 = getLineAttachmentPatch(shapeComposite, {
      update: {
        [line.id]: { q: { x: 0, y: 100 } } as Partial<LineShape>,
        unknown: { q: { x: 0, y: 100 } } as Partial<LineShape>,
      },
    });
    expect(Object.keys(result0)).toEqual([shapeA.id, shapeB.id]);
  });
});

describe("getAffineByMoveToAttachedPoint", () => {
  test("should return shape patch to move to the point", () => {
    const shape = createShape(getCommonStruct, "rectangle", { id: "a" });
    const shapeComposite = newShapeComposite({
      shapes: [shape],
      getStruct: getCommonStruct,
    });

    const result0 = getAffineByMoveToAttachedPoint(shapeComposite, shape, { x: 0.5, y: 0.5 }, { x: 100, y: 100 });
    expect(result0).toEqual([1, 0, 0, 1, 50, 50]);

    const result1 = getAffineByMoveToAttachedPoint(shapeComposite, shape, { x: 0.2, y: 0.8 }, { x: 100, y: 100 });
    expect(result1).toEqual([1, 0, 0, 1, 80, 20]);
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

    const rotated = { ...shape, height: 200, rotation: Math.PI / 2 };
    const shapeComposite1 = newShapeComposite({
      shapes: [rotated],
      getStruct: getCommonStruct,
    });
    expect(getAttachmentAnchorPoint(shapeComposite1, rotated)).toEqualPoint({
      x: 30,
      y: 80,
    });
  });

  test("should return anchor point: group shape", () => {
    const group = createShape(getCommonStruct, "group", {
      id: "group",
      attachment: {
        id: "line",
        to: { x: 0.2, y: 0 },
        anchor: { x: 0.5, y: 0 },
        rotationType: "relative",
        rotation: 0,
      },
    });
    const a = createShape(getCommonStruct, "rectangle", { id: "a", parentId: group.id });
    const b = { ...a, id: "b", p: { x: 0, y: 100 } };
    const shapeComposite = newShapeComposite({
      shapes: [group, a, b],
      getStruct: getCommonStruct,
    });
    expect(getAttachmentAnchorPoint(shapeComposite, group)).toEqualPoint({ x: 50, y: 0 });

    const rotated = { ...group, rotation: Math.PI / 2 };
    const shapeComposite1 = newShapeComposite({
      shapes: [
        rotated,
        { ...a, p: { x: 50, y: 50 }, rotation: Math.PI / 2 },
        { ...b, p: { x: -50, y: 50 }, rotation: Math.PI / 2 },
      ],
      getStruct: getCommonStruct,
    });
    expect(getAttachmentAnchorPoint(shapeComposite1, rotated)).toEqualPoint({
      x: 150,
      y: 100,
    });
  });
});

describe("getNextAttachmentAnchor", () => {
  test("should return anchor rate for the point", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "a",
      height: 200,
      rotation: Math.PI / 2,
    });
    const shapeComposite = newShapeComposite({
      shapes: [shape],
      getStruct: getCommonStruct,
    });
    expect(getNextAttachmentAnchor(shapeComposite, shape, { x: 50, y: 100 })).toEqualPoint({ x: 0.5, y: 0.5 });
    expect(getNextAttachmentAnchor(shapeComposite, shape, { x: 50, y: 50 })).toEqualPoint({ x: 0, y: 0.5 });
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

describe("newPreserveAttachmentHandler", () => {
  const line = createShape<LineShape>(getCommonStruct, "line", { id: "line", q: { x: 100, y: 0 } });
  const shapeA = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "a",
    p: { x: 25, y: -25 },
    width: 50,
    height: 50,
    attachment: {
      id: line.id,
      to: { x: 0.5, y: 0 },
      anchor: { x: 0.5, y: 0.5 },
      rotationType: "absolute",
      rotation: 0,
    },
  });

  describe("getPatch", () => {
    test("should leave attached shape where it was when the line still runs through there", () => {
      const shapeComposite = newShapeComposite({
        shapes: [line, shapeA],
        getStruct: getCommonStruct,
      });
      const target = newPreserveAttachmentHandler({ shapeComposite, lineId: line.id });
      target.setActive(true);
      const result0 = target.getPatch({ q: { x: 200, y: 0 } });
      expect(result0).toEqual({
        [shapeA.id]: { attachment: { ...shapeA.attachment, to: { x: 0.25, y: 0 } } },
      });
      const result1 = target.getPatch({ p: { x: -100, y: 0 } });
      expect(result1).toEqual({
        [shapeA.id]: { attachment: { ...shapeA.attachment, to: { x: 0.75, y: 0 } } },
      });
    });

    test("should return undefined when it's not active", () => {
      const shapeComposite = newShapeComposite({
        shapes: [line, shapeA],
        getStruct: getCommonStruct,
      });
      const target = newPreserveAttachmentHandler({ shapeComposite, lineId: line.id });
      target.setActive(false);
      expect(target.getPatch({ q: { x: 0, y: 100 } })).toBe(undefined);
    });
  });
});

describe("newPreserveAttachmentByShapeHandler", () => {
  const line = createShape<LineShape>(getCommonStruct, "line", { id: "line", q: { x: 100, y: 0 } });
  const shapeA = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "a",
    p: { x: 25, y: -25 },
    width: 50,
    height: 50,
    attachment: {
      id: line.id,
      to: { x: 0.5, y: 0 },
      anchor: { x: 0.5, y: 0.5 },
      rotationType: "absolute",
      rotation: 0,
    },
  });

  test("should return patch to preserve line attachments", () => {
    const shapeComposite = newShapeComposite({
      shapes: [line, shapeA],
      getStruct: getCommonStruct,
    });
    const handler = newPreserveAttachmentByShapeHandler({ shapeComposite });
    const res0 = handler.getPatch({ a: { p: { x: 10, y: 0 } } });
    expect(Object.keys(res0)).toEqual(["a"]);
    expect(res0["a"].attachment?.to).toEqualPoint({ x: 0.35, y: 0 });
    expect(res0["a"].attachment?.anchor).toEqualPoint({ x: 0.5, y: 0.5 });
    expect(Object.keys(res0["a"]), "should update attachment only").toEqual(["attachment"]);
  });

  test("should return patch to preserve line attachments: keepAnchor is true", () => {
    const shapeComposite = newShapeComposite({
      shapes: [line, shapeA],
      getStruct: getCommonStruct,
    });
    const handler = newPreserveAttachmentByShapeHandler({ shapeComposite, keepAnchor: true });

    // Original anchor can stay inside the shape
    const res0 = handler.getPatch({ a: { p: { x: 10, y: -25 } } });
    expect(res0["a"].attachment?.to).toEqualPoint({ x: 0.5, y: 0 });
    expect(res0["a"].attachment?.anchor).toEqualPoint({ x: 0.8, y: 0.5 });

    // Original anchor can't stay inside the shape but patched anchor can
    const res1 = handler.getPatch({ a: { p: { x: -10, y: -25 } } });
    expect(res1["a"].attachment?.to).toEqualPoint({ x: 0.15, y: 0 });
    expect(res1["a"].attachment?.anchor).toEqualPoint({ x: 0.5, y: 0.5 });

    // No anchor can stay inside the shape
    const res2 = handler.getPatch({ a: { p: { x: -60, y: -25 } } });
    expect(res2["a"]).toHaveProperty("attachment");
    expect(res2["a"].attachment).toBe(undefined);
  });
});

describe("snapRectWithLineAttachment", () => {
  test("should return line attachment with snapping", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", { id: "line", q: { x: 100, y: 100 } });
    const snappingResult: SnappingResult = {
      diff: { x: 2, y: 0 },
      targets: [
        {
          id: "a",
          line: [
            { x: 50, y: 0 },
            { x: 50, y: 100 },
          ],
        },
      ],
      intervalTargets: [],
    };
    const result0 = snapRectWithLineAttachment({
      line,
      edgeInfo: getLineEdgeInfo(line),
      snappingResult,
      movingRect: { x: 48, y: 48, width: 10, height: 10 },
      movingRectAnchorRate: 0.58,
      movingRectAnchor: { x: 58, y: 58 },
      scale: 1,
    });
    expect(result0?.lineAnchor).toEqualPoint({ x: 60, y: 60 });
    expect(result0?.lineAnchorRate).toBeCloseTo(0.6);

    const result1 = snapRectWithLineAttachment({
      line,
      edgeInfo: getLineEdgeInfo(line),
      snappingResult: { ...snappingResult, diff: { x: -2, y: 0 } },
      movingRect: { x: 42, y: 42, width: 10, height: 10 },
      movingRectAnchorRate: 0.42,
      movingRectAnchor: { x: 42, y: 42 },
      scale: 1,
    });
    expect(result1?.lineAnchor).toEqualPoint({ x: 40, y: 40 });
    expect(result1?.lineAnchorRate).toBeCloseTo(0.4);
  });
});
