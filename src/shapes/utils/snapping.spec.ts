import { describe, test, expect } from "vitest";
import { getStandardSnappingLines } from "./snapping";
import { createShape, getCommonStruct, getLocalRectPolygon, getWrapperRect } from "..";
import { RectangleShape } from "../rectangle";

describe("getStandardSnappingLines", () => {
  test("should return only orthogonal lines when rotation is 0", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      p: { x: 0, y: 0 },
      width: 100,
      height: 100,
      rotation: 0,
    });
    const rect = getWrapperRect(getCommonStruct, shape);
    const localRectPolygon = getLocalRectPolygon(getCommonStruct, shape);
    const result = getStandardSnappingLines(rect, localRectPolygon, shape.rotation);
    expect(result.linesByRotation.size).toBe(2);
    expect(result.linesByRotation.has(0)).toBe(true);
    expect(result.linesByRotation.has(Math.PI / 2)).toBe(true);
  });

  test("should return only orthogonal lines when rotation is a multiple of PI/2", () => {
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      p: { x: 0, y: 0 },
      width: 100,
      height: 100,
      rotation: Math.PI / 2,
    });
    const rect = getWrapperRect(getCommonStruct, shape);
    const localRectPolygon = getLocalRectPolygon(getCommonStruct, shape);
    const result = getStandardSnappingLines(rect, localRectPolygon, shape.rotation);
    expect(result.linesByRotation.size).toBe(2);
    expect(result.linesByRotation.has(0)).toBe(true);
    expect(result.linesByRotation.has(Math.PI / 2)).toBe(true);
  });

  test("should return orthogonal and rotated lines when rotation is non-orthogonal", () => {
    const r = Math.PI / 4;
    const shape = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      p: { x: 0, y: 0 },
      width: 100,
      height: 100,
      rotation: r,
    });
    const rect = getWrapperRect(getCommonStruct, shape);
    const localRectPolygon = getLocalRectPolygon(getCommonStruct, shape);
    const result = getStandardSnappingLines(rect, localRectPolygon, shape.rotation);
    expect(result.linesByRotation.size).toBe(4);
    expect(result.linesByRotation.has(0)).toBe(true);
    expect(result.linesByRotation.has(Math.PI / 2)).toBe(true);
    // Rotated keys: normalizeLineRotation(r) and normalizeLineRotation(r + PI/2)
    // For r = PI/4: hKey = PI/4, vKey = PI/4 + PI/2 = 3*PI/4 -> normalized = 3*PI/4
    expect(result.linesByRotation.has(Math.PI / 4)).toBe(true);
    expect(result.linesByRotation.has((3 * Math.PI) / 4)).toBe(true);
    // Each rotated direction should have 3 lines
    expect(result.linesByRotation.get(Math.PI / 4)).toHaveLength(3);
    expect(result.linesByRotation.get((3 * Math.PI) / 4)).toHaveLength(3);
  });
});
