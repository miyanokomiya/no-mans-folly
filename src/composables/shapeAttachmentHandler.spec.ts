import { describe, test, expect } from "vitest";
import { canDetachFromShape, getShapeAttachmentPatch } from "./shapeAttachmentHandler";
import { newShapeComposite } from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { ShapeAttachment } from "../models";
import { RectangleShape } from "../shapes/rectangle";

const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a" });
const line = createShape(getCommonStruct, "line", { id: "line" });
const frame = createShape(getCommonStruct, "frame", { id: "frame" });
const group = createShape(getCommonStruct, "group", { id: "group" });
const child = createShape(getCommonStruct, "rectangle", { id: "child", parentId: group.id });
const label = createShape(getCommonStruct, "text", { id: "label", parentId: line.id });
const attached = createShape(getCommonStruct, "rectangle", { id: "attached" });
const attachment: ShapeAttachment = {
  id: attached.id,
  to: { x: 0.5, y: 0.5 },
  anchor: { x: 0.5, y: 0.5 },
  rotationType: "relative",
  rotation: 0,
};

describe("canDetachFromShape", () => {
  test("should return true when the shape can detach from a shape", () => {
    const shapeComposite = newShapeComposite({
      shapes: [shape, line, frame, group, child, label],
      getStruct: getCommonStruct,
    });
    expect(canDetachFromShape(shapeComposite, shape)).toBe(false);
    expect(canDetachFromShape(shapeComposite, { ...shape, attachment })).toBe(true);
    expect(canDetachFromShape(shapeComposite, { ...line, attachment })).toBe(false);
    expect(canDetachFromShape(shapeComposite, { ...frame, attachment })).toBe(false);
    expect(canDetachFromShape(shapeComposite, { ...child, attachment })).toBe(true);
  });
});

describe("getShapeAttachmentPatch", () => {
  test("should return patch info regarding shape attachments", () => {
    const source = { ...shape, attachment, p: { x: 200, y: 20 } };
    const shapeComposite = newShapeComposite({
      shapes: [attached, source],
      getStruct: getCommonStruct,
    });

    const res0 = getShapeAttachmentPatch(shapeComposite, { update: { [attached.id]: { p: { x: 100, y: 10 } } } });
    expect(res0[source.id]).toEqual({ p: { x: 300, y: 30 } });

    const res1 = getShapeAttachmentPatch(shapeComposite, {
      update: { [attached.id]: { width: 200, height: 300 } as Partial<RectangleShape> },
    });
    expect(res1[source.id]).toEqual({ p: { x: 250, y: 120 } });
  });

  test("should regard rotation", () => {
    const rotated = { ...attached, rotation: Math.PI / 2 };
    const source = { ...shape, attachment, p: { x: 200, y: 20 } };
    const shapeComposite = newShapeComposite({
      shapes: [rotated, source],
      getStruct: getCommonStruct,
    });
    const res0 = getShapeAttachmentPatch(shapeComposite, { update: { [rotated.id]: { p: { x: 100, y: 10 } } } });
    expect(res0[source.id]).toEqual({ p: { x: 300, y: 30 }, rotation: Math.PI / 2 });

    const res1 = getShapeAttachmentPatch(shapeComposite, { update: { [rotated.id]: { rotation: 0 } } });
    expect(res1[source.id]).toEqual({ p: { x: 20, y: -200 } });
  });

  test("should update rotation when relative rotation changes", () => {
    const source0 = { ...shape, rotation: Math.PI, attachment };
    const source1 = { ...shape, rotation: Math.PI, attachment: { ...attachment, rotationType: "absolute" as const } };
    const shapeComposite = newShapeComposite({
      shapes: [{ ...attached, rotation: Math.PI / 2 }, source0, source1],
      getStruct: getCommonStruct,
    });

    const res0 = getShapeAttachmentPatch(shapeComposite, {
      update: {
        [source0.id]: { attachment: { ...attachment, rotationType: "absolute" } },
      },
    });
    expect(res0[source0.id]).toEqual(undefined);

    const res1 = getShapeAttachmentPatch(shapeComposite, {
      update: {
        [source0.id]: { attachment: { ...attachment, rotation: Math.PI / 4 } },
      },
    });
    expect(res1[source0.id]).toEqual({ rotation: Math.PI * 0.75 });

    const res2 = getShapeAttachmentPatch(shapeComposite, {
      update: {
        [source1.id]: { attachment: { ...attachment, rotationType: "relative" } },
      },
    });
    expect(res2[source1.id]).toEqual({ rotation: Math.PI / 2 });
  });

  test("should ignore shapes attaching to a line", () => {
    const source = { ...shape, rotation: Math.PI / 2, attachment: { ...attachment, id: line.id } };
    const shapeComposite = newShapeComposite({
      shapes: [line, source],
      getStruct: getCommonStruct,
    });
    const res0 = getShapeAttachmentPatch(shapeComposite, { update: { [source.id]: { p: { x: 100, y: 10 } } } });
    expect(res0[source.id]).toBeUndefined();
  });
});
