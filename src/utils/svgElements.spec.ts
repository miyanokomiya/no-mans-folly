import { describe, test, expect } from "vitest";
import {
  applyRotatedRectTransformToRawPath,
  createSVGElement,
  createSVGSVGElement,
  renderTransform,
} from "./svgElements";

describe("createSVGSVGElement", () => {
  test("should return <svg> element", () => {
    const result0 = createSVGSVGElement({ id: "a", width: 10 });
    expect(result0.tagName.toUpperCase()).toBe("SVG");
    expect(result0.id).toBe("a");
    expect(result0.getAttribute("width")).toBe("10");
  });
});

describe("createSVGElement", () => {
  test("should return SVG element", () => {
    const result0 = createSVGElement<SVGRectElement>("rect", { id: "a", width: 10 });
    expect(result0.tagName.toUpperCase()).toBe("RECT");
    expect(result0.id).toBe("a");
    expect(result0.getAttribute("width")).toBe("10");
  });
});

describe("renderTransform", () => {
  test("should return transfrom matrix attribute value", () => {
    expect(renderTransform([1, 2, 3, 4, 5, 6])).toBe("matrix(1 2 3 4 5 6)");
  });

  test("should return undefined when the affine is identity", () => {
    expect(renderTransform([1, 0, 0, 1, 0, 0])).toBe(undefined);
  });
});

describe("applyRotatedRectTransformToRawPath", () => {
  test("should apply rect transform", () => {
    const rect = { x: 100, y: 200, width: 40, height: 80 };
    expect(applyRotatedRectTransformToRawPath(rect, 0, [["L", 10, 30]])).toEqual([["L", 110, 230]]);
    expect(applyRotatedRectTransformToRawPath(rect, Math.PI / 2, [["L", 10, 40]])).toEqual([["L", 120, 230]]);
  });
});
