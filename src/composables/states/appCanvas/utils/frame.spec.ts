import { describe, test, expect } from "vitest";
import { duplicateFrameTreeItem, insertFrameTreeItem } from "./frame";
import { createShape, getCommonStruct } from "../../../../shapes";
import { newShapeComposite } from "../../../shapeComposite";
import { RectPolygonShape } from "../../../../shapes/rectPolygon";
import { generateKeyBetween } from "../../../../utils/findex";

const frameGroup = createShape<RectPolygonShape>(getCommonStruct, "frame_align_group", {
  id: "frameGroup",
  findex: generateKeyBetween(null, null),
  width: 500,
  height: 500,
});
const frame0 = createShape<RectPolygonShape>(getCommonStruct, "frame", {
  id: "frame0",
  parentId: frameGroup.id,
  findex: generateKeyBetween(frameGroup.findex, null),
  p: { x: 0, y: 0 },
  width: 100,
  height: 100,
});
const frame1 = {
  ...frame0,
  id: "frame1",
  findex: generateKeyBetween(frame0.findex, null),
  p: { x: 100, y: 0 },
};
const rect = createShape<RectPolygonShape>(getCommonStruct, "rectangle", {
  id: "rect",
  p: { x: 10, y: 10 },
  findex: generateKeyBetween(frame1.findex, null),
  width: 10,
  height: 10,
});

function getCtx() {
  let count = 0;
  return {
    getShapeComposite: () =>
      newShapeComposite({
        shapes: [frameGroup, frame0, frame1, rect],
        getStruct: getCommonStruct,
      }),
    getDocumentMap: () => ({}),
    generateUuid: () => `${++count}`,
    createLastIndex: () => generateKeyBetween(rect.findex, null),
  };
}

describe("insertFrameTreeItem", () => {
  test("should insert new frame item as the next sibling", () => {
    const result0 = insertFrameTreeItem(getCtx(), frameGroup.id);
    expect(result0.type).toBe(frameGroup.type);
    expect(frameGroup.findex < result0.findex).toBe(true);
    expect(result0.p).toEqualPoint({ x: 0, y: 550 });

    const result1 = insertFrameTreeItem(getCtx(), frame0.id);
    expect(result1.type).toBe(frame0.type);
    expect(frame0.findex < result1.findex && result1.findex < frame1.findex).toBe(true);
    expect(result1.p).toEqualPoint({ x: 0, y: 150 });

    const result2 = insertFrameTreeItem(getCtx(), frame1.id);
    expect(result2.type).toBe(frame0.type);
    expect(frame1.findex < result2.findex).toBe(true);
    expect(result2.p).toEqualPoint({ x: 100, y: 150 });
  });
});

describe("duplicateFrameTreeItem", () => {
  test("should duplicate a frame in the frame align group and align it", () => {
    const result0 = duplicateFrameTreeItem(getCtx(), frame0.id);
    expect(result0.map((s) => s.type)).toEqual([frame0.type, rect.type]);
    expect(result0.map((s) => s.p)).toEqualPoints([
      { x: 120, y: 10 },
      { x: 130, y: 20 },
    ]);
  });

  test("should duplicate a frame group", () => {
    const result0 = duplicateFrameTreeItem(getCtx(), frameGroup.id);
    expect(result0.map((s) => s.type)).toEqual([frameGroup.type, frame0.type, frame1.type, rect.type]);
    expect(result0.map((s) => s.p)).toEqualPoints([
      { x: -540, y: 0 },
      { x: -540, y: 0 },
      { x: -440, y: 0 },
      { x: -530, y: 10 },
    ]);
  });
});
