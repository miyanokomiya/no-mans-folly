import { describe, test, expect } from "vitest";
import { getDummyShapeCompositeForFrameAlign, getFrameAlignLayoutPatch } from "./frameAlignGroupHandler";
import { newShapeComposite } from "../shapeComposite";
import { createShape, getCommonStruct } from "../../shapes";
import { FrameShape } from "../../shapes/frame";
import { RectangleShape } from "../../shapes/rectangle";
import { FrameAlignGroupShape } from "../../shapes/frameGroups/frameAlignGroup";

describe("getFrameAlignLayoutPatch", () => {
  const frameAlign1 = createShape<FrameAlignGroupShape>(getCommonStruct, "frame_align_group", {
    id: "frame_align_group1",
    p: { x: 1000, y: 0 },
    gapC: 10,
    gapR: 10,
    padding: [10, 10, 10, 10],
    width: 100,
    height: 100,
  });
  const frame1 = createShape<FrameShape>(getCommonStruct, "frame", {
    id: "frame1",
    p: { x: 0, y: 0 },
    width: 100,
    height: 100,
  });
  const shape1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "shape1",
    p: { x: 10, y: 20 },
    width: 10,
    height: 10,
  });
  const shape2 = {
    ...shape1,
    id: "shape2",
    p: { x: 110, y: 120 },
  };

  test("should align frames with their children", () => {
    const shapeComposite = newShapeComposite({
      shapes: [frameAlign1, frame1, shape1, shape2],
      getStruct: getCommonStruct,
    });

    const result1 = getFrameAlignLayoutPatch(shapeComposite, { update: { [frame1.id]: { parentId: frameAlign1.id } } });
    expect(result1).toEqual({
      frame1: {
        p: {
          x: 1010,
          y: 10,
        },
      },
      frame_align_group1: {
        width: 120,
        height: 120,
      },
      shape1: {
        p: {
          x: 1020,
          y: 30,
        },
      },
    });
  });

  test("should regard newly added frames", () => {
    const shapeComposite = newShapeComposite({
      shapes: [frameAlign1, frame1, shape1, shape2],
      getStruct: getCommonStruct,
    });

    const frame2 = {
      ...frame1,
      id: "frame2",
      parentId: frameAlign1.id,
    };
    const result1 = getFrameAlignLayoutPatch(shapeComposite, { add: [frame2] });
    expect(result1).toEqual({
      frame2: {
        p: {
          x: 1010,
          y: 10,
        },
      },
      frame_align_group1: {
        width: 120,
        height: 120,
      },
    });
  });
});

describe("getDummyShapeCompositeForFrameAlign", () => {
  test("should return shape composite with frame shapes turning into dummy ones", () => {
    const frame1 = createShape(getCommonStruct, "frame", { id: "frame1" });
    const frameAlign1 = createShape(getCommonStruct, "frame_align_group", { id: "frame_align_group1" });
    const shapeComposite = newShapeComposite({
      shapes: [frame1, frameAlign1],
      getStruct: getCommonStruct,
    });
    const result = getDummyShapeCompositeForFrameAlign(shapeComposite);
    expect(result.shapeMap[frame1.id]).toEqual({ ...frame1, type: "rectangle" });
    expect(result.shapeMap[frameAlign1.id]).toEqual({ ...frameAlign1, type: "align_box" });
  });
});
