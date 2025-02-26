import { describe, test, expect } from "vitest";
import { getSegmentOriginRadian, getTargetSegment } from "./lineSegmentEditingHandler";

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
