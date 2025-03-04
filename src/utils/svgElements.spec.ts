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

  test("should return SVG element: rounded coordinates", () => {
    const path = createSVGElement<SVGPathElement>(
      "rect",
      { id: "a", d: "M 11.8999999999 0 L 1 2.4999999999999", transform: "matrix(1,0,0,1,21.399999999,11.399999999)" },
      undefined,
      { roundFloat: true },
    );
    expect(path.getAttribute("d")).toBe("M 11.9 0 L 1 2.5");
    expect(path.getAttribute("transform")).toBe("matrix(1 0 0 1 21.4 11.4)");

    const rect = createSVGElement<SVGRectElement>(
      "rect",
      { id: "a", x: "1.8999999999", y: "2.8999999999", width: "11.8999999999", height: "21.8999999999" },
      undefined,
      { roundFloat: true },
    );
    expect(rect.getAttribute("x")).toBe("1.9");
    expect(rect.getAttribute("y")).toBe("2.9");
    expect(rect.getAttribute("width")).toBe("11.9");
    expect(rect.getAttribute("height")).toBe("21.9");
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
