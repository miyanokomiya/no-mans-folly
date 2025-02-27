import { describe, test, expect } from "vitest";
import {
  getSegmentOriginRadian,
  getSegmentRadian,
  getTargetSegment,
  patchLineSegment,
} from "./lineSegmentEditingHandler";
import { ISegment } from "../../utils/geometry";
import { newShapeComposite } from "../shapeComposite";
import { createShape, getCommonStruct } from "../../shapes";
import { LineShape } from "../../shapes/line";

describe("getSegmentOriginRadian", () => {
  test("should return radian from the target origin to the previous point", () => {
    const vertices = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(getSegmentOriginRadian(vertices, 0, 0)).toBeCloseTo(0);
    expect(getSegmentOriginRadian(vertices, 1, 0)).toBeCloseTo(0);
    expect(getSegmentOriginRadian(vertices, 0, 0, true)).toBeCloseTo(0);
    expect(getSegmentOriginRadian(vertices, 1, 0, true)).toBeCloseTo((-Math.PI * 3) / 4);
    expect(getSegmentOriginRadian(vertices, 0, 1, true)).toBeCloseTo(Math.PI);
    expect(getSegmentOriginRadian(vertices, 1, 1, true)).toBeCloseTo(0);
  });
});

describe("getTargetSegment", () => {
  test("should return the target segment", () => {
    const vertices = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(getTargetSegment(vertices, 0, 0)).toEqualPoints([vertices[0], vertices[1]]);
    expect(getTargetSegment(vertices, 1, 0)).toEqualPoints([vertices[1], vertices[2]]);
    expect(getTargetSegment(vertices, 0, 1)).toEqualPoints([vertices[1], vertices[0]]);
    expect(getTargetSegment(vertices, 1, 1)).toEqualPoints([vertices[2], vertices[1]]);
  });
});

describe("getSegmentRadian", () => {
  test("should return radian of the latest segment", () => {
    const src: ISegment = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(
      getSegmentRadian(src, [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
      ]),
    ).toBeCloseTo(Math.PI / 2);
    expect(
      getSegmentRadian(src, [
        { x: 0, y: 0 },
        { x: 0, y: -10 },
      ]),
    ).toBeCloseTo(-Math.PI / 2);
  });
  test("should return radian of the source segment when the latest one is zero sized", () => {
    const latest: ISegment = [
      { x: 10, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(
      getSegmentRadian(
        [
          { x: 0, y: 0 },
          { x: 0, y: 10 },
        ],
        latest,
      ),
    ).toBeCloseTo(Math.PI / 2);
    expect(
      getSegmentRadian(
        [
          { x: 0, y: 0 },
          { x: 0, y: -10 },
        ],
        latest,
      ),
    ).toBeCloseTo(-Math.PI / 2);
  });
});

describe("patchLineSegment", () => {
  const line = createShape<LineShape>(getCommonStruct, "line", {
    id: "line",
    p: { x: 0, y: 0 },
    body: [{ p: { x: 10, y: 0 } }],
    q: { x: 10, y: 10 },
  });
  const shapeComposite = newShapeComposite({
    getStruct: getCommonStruct,
    shapes: [line],
  });

  test("should patch size of the segment", () => {
    expect(
      patchLineSegment(shapeComposite, line.id, 0, 0, 0, 20, undefined, false)?.body?.map((b) => b.p),
    ).toEqualPoints([{ x: 20, y: 0 }]);
    expect(patchLineSegment(shapeComposite, line.id, 0, 1, Math.PI, 20, undefined, false)?.p).toEqualPoint({
      x: -10,
      y: 0,
    });
    expect(patchLineSegment(shapeComposite, line.id, 1, 0, Math.PI / 2, 20, undefined, false)?.q).toEqualPoint({
      x: 10,
      y: 20,
    });
    expect(
      patchLineSegment(shapeComposite, line.id, 1, 1, -Math.PI / 2, 20, undefined, false)?.body?.map((b) => b.p),
    ).toEqualPoints([{ x: 10, y: -10 }]);
  });

  test("should patch size of the segment based on segmentRadian", () => {
    expect(
      patchLineSegment(shapeComposite, line.id, 0, 0, Math.PI / 2, 20, undefined, false)?.body?.map((b) => b.p),
    ).toEqualPoints([{ x: 0, y: 20 }]);
    expect(patchLineSegment(shapeComposite, line.id, 1, 0, Math.PI, 20, undefined, false)?.q).toEqualPoint({
      x: -10,
      y: 0,
    });
  });

  test("should patch rotation of the segment", () => {
    expect(
      patchLineSegment(shapeComposite, line.id, 0, 0, 0, undefined, Math.PI / 2, false)?.body?.map((b) => b.p),
    ).toEqualPoints([{ x: 0, y: 10 }]);
    expect(patchLineSegment(shapeComposite, line.id, 0, 1, Math.PI, undefined, -Math.PI / 2, false)?.p).toEqualPoint({
      x: 10,
      y: -10,
    });
    expect(patchLineSegment(shapeComposite, line.id, 1, 0, Math.PI / 2, undefined, 0, false)?.q).toEqualPoint({
      x: 20,
      y: 0,
    });
    expect(
      patchLineSegment(shapeComposite, line.id, 1, 1, -Math.PI / 2, undefined, Math.PI, false)?.body?.map((b) => b.p),
    ).toEqualPoints([{ x: 0, y: 10 }]);
  });

  test("should patch rotation of the segment: relatively", () => {
    expect(patchLineSegment(shapeComposite, line.id, 0, 1, Math.PI, undefined, -Math.PI / 2, true)?.p).toEqualPoint({
      x: 20,
      y: 0,
    });
  });
});
