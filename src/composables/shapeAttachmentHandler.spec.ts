import { describe, test, expect } from "vitest";
import { canDetachFromShape, getAttachmentOption, getShapeAttachmentPatch } from "./shapeAttachmentHandler";
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

describe("getAttachmentOption", () => {
  test("should return attachment option for the targets", () => {
    const shapeComposite = newShapeComposite({
      shapes: [shape, line, frame, group, { ...child, attachment }, label],
      getStruct: getCommonStruct,
    });
    expect(getAttachmentOption(shapeComposite, [])).toBe(undefined);
    expect(getAttachmentOption(shapeComposite, [shape.id])).toBe("attach");
    expect(getAttachmentOption(shapeComposite, [shape.id, line.id])).toBe("attach");
    expect(getAttachmentOption(shapeComposite, [line.id])).toBe(undefined);
    expect(getAttachmentOption(shapeComposite, [child.id])).toBe("detach");
    expect(getAttachmentOption(shapeComposite, [shape.id, child.id])).toBe("attach");
  });
});

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

  test("should initialize relative angle when it's newly set", () => {
    const source = { ...shape, rotation: Math.PI, attachment: { ...attachment, rotationType: "absolute" as const } };
    const shapeComposite = newShapeComposite({
      shapes: [{ ...attached, rotation: Math.PI / 2 }, source],
      getStruct: getCommonStruct,
    });

    const res0 = getShapeAttachmentPatch(shapeComposite, {
      update: {
        [source.id]: { attachment: { ...attachment, rotationType: "relative" } },
      },
    });
    expect(res0[source.id]).toEqual({ rotation: Math.PI / 2 });
  });
});
