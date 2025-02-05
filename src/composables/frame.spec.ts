import { describe, test, expect } from "vitest";
import { createShape, getCommonStruct } from "../shapes";
import { FrameShape } from "../shapes/frame";
import { RectangleShape } from "../shapes/rectangle";
import { newShapeComposite } from "./shapeComposite";
import { getAllFrameShapes, getFrameRect, getRootShapeIdsByFrame } from "./frame";
import { COLORS } from "../utils/color";
import { FrameAlignGroupShape } from "../shapes/frameGroups/frameAlignGroup";

describe("getAllFrameShapes", () => {
  test("getAllFrameShapes", () => {
    const frame0 = createShape<FrameShape>(getCommonStruct, "frame", { id: "frame0" });
    const frame1 = { ...frame0, id: "frame1" };
    const rect0 = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "rect0" });
    const rect1 = { ...rect0, id: "rect1" };
    const shapes = [frame0, frame1, rect0, rect1];
    const shapeComposite = newShapeComposite({
      shapes,
      tmpShapeMap: { [rect0.id]: { p: { x: 10, y: 10 } } },
      getStruct: getCommonStruct,
    });
    expect(getAllFrameShapes(shapeComposite)).toEqual([frame0, frame1]);
  });
});

describe("getRootShapeIdsByFrame", () => {
  const frame = createShape<FrameShape>(getCommonStruct, "frame", {
    id: "frame",
    p: { x: 0, y: 0 },
    width: 100,
    height: 100,
  });
  const rect0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "rect0",
    p: { x: 40, y: 40 },
    width: 100,
    height: 100,
  });
  const rect1 = {
    ...rect0,
    id: "rect1",
    p: { x: 60, y: 60 },
  };
  const rect2 = {
    ...rect0,
    id: "rect2",
    p: { x: -40, y: -40 },
  };

  test("should return ids of conventional shapes that are in the frame", () => {
    const shapes = [frame, rect0, rect1, rect2];
    const shapeComposite = newShapeComposite({
      shapes,
      tmpShapeMap: { [rect0.id]: { p: { x: 10, y: 10 } } },
      getStruct: getCommonStruct,
    });
    expect(getRootShapeIdsByFrame(shapeComposite, frame)).toEqual([rect0.id, rect2.id]);
  });

  test("should ignore child shapes", () => {
    const group = createShape<RectangleShape>(getCommonStruct, "group", { id: "group" });
    const rect3 = {
      ...rect2,
      id: "rect3",
      p: { x: -140, y: -140 },
      parentId: group.id,
    };
    const shapes = [frame, rect0, { ...rect2, parentId: group.id }, rect3, group];
    const shapeComposite = newShapeComposite({
      shapes,
      tmpShapeMap: { [rect0.id]: { p: { x: 10, y: 10 } } },
      getStruct: getCommonStruct,
    });
    expect(getRootShapeIdsByFrame(shapeComposite, frame)).toEqual([rect0.id]);
  });

  test("should ignore shapes having same or small order priority", () => {
    const frame1 = {
      ...frame,
      id: "frame1",
      width: 20,
      height: 20,
    };
    const frame_align = createShape<FrameAlignGroupShape>(getCommonStruct, "frame_align_group", {
      id: "frame_align",
      p: { x: 0, y: 0 },
      width: 20,
      height: 20,
    });
    const shapes = [frame, frame1, frame_align];
    const shapeComposite = newShapeComposite({
      shapes,
      tmpShapeMap: { [rect0.id]: { p: { x: 10, y: 10 } } },
      getStruct: getCommonStruct,
    });
    expect(getRootShapeIdsByFrame(shapeComposite, frame)).toEqual([]);
  });
});

describe("getFrameRect", () => {
  test("should return wrapper rectangle of the frame", () => {
    const frame = createShape<FrameShape>(getCommonStruct, "frame", {
      id: "frame",
      p: { x: 10, y: 20 },
      width: 100,
      height: 200,
      stroke: { color: COLORS.BLACK, width: 3 },
    });
    expect(getFrameRect(frame)).toEqualRect({ x: 10, y: 20, width: 100, height: 200 });
    expect(getFrameRect(frame, true), "include border").toEqualRect({ x: 8.5, y: 18.5, width: 103, height: 203 });
  });
});
