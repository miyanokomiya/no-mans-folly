import { describe, test, expect } from "vitest";
import { canMakePolygon } from "./linePolygon";
import { createShape, getCommonStruct } from "..";
import { LineShape } from "../line";

describe("canMakePolygon", () => {
  test("should return true when a line can be converted to a polygon", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {});
    expect(canMakePolygon(line)).toBe(false);
    expect(canMakePolygon({ ...line, lineType: "elbow" })).toBe(false);
    expect(canMakePolygon({ ...line, body: [{ p: { x: 10, y: 10 } }], curves: [] })).toBe(true);
    expect(canMakePolygon({ ...line, body: [{ p: { x: 10, y: 10 } }], curves: [], lineType: "elbow" })).toBe(false);
    expect(canMakePolygon({ ...line, body: [], curves: [{ d: { x: 10, y: 10 } }] })).toBe(true);
  });
});
