import { describe, test, expect } from "vitest";
import { createSVGElement, createSVGSVGElement } from "./svgElements";
import { ShapeTemplateInfo, createTemplateShapeEmbedElement, parseTemplateShapesFromSVG } from "./shapeTemplateUtil";
import { createShape, getCommonStruct } from "../shapes";

// Note: "DOMParser" in "happy-dom" doesn't support SVG.
describe("parseTemplateShapesFromSVG", () => {
  test("should return undefined if there's no template in SVG", () => {
    const data = { shapes: [], docs: {} };
    const svg = createSVGSVGElement();
    const def = createSVGElement("def", {
      "data-folly-template": JSON.stringify(data),
    });
    svg.appendChild(def);
    expect(parseTemplateShapesFromSVG(svg)).toEqual(undefined);
  });

  test("should parse template shapes from SVG if it exists", () => {
    const data: ShapeTemplateInfo = {
      shapes: [createShape(getCommonStruct, "rectangle", { id: "a" })],
      docs: [["a", [{ insert: "abc\n" }]]],
    };
    const svg = createSVGSVGElement();
    const def = createSVGElement("def", {
      "data-folly-template": JSON.stringify(data),
    });
    svg.appendChild(def);
    expect(parseTemplateShapesFromSVG(svg)).toEqual(data);
  });
});

describe("createTemplateShapeEmbedElement", () => {
  test("should return def element with template data embedded", () => {
    const data: ShapeTemplateInfo = {
      shapes: [createShape(getCommonStruct, "rectangle", { id: "a" })],
      docs: [["a", [{ insert: "abc\n" }]]],
    };
    const elm = createTemplateShapeEmbedElement(data);
    expect(elm.tagName).toBe("def");
    expect(elm.getAttribute("data-folly-template")).toBe(JSON.stringify(data));
  });
});
