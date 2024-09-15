import { describe, test, expect } from "vitest";
import { createSVGElement, createSVGSVGElement } from "../../utils/svgElements";
import { ShapeTemplateInfo, createTemplateShapeEmbedElement, parseTemplateShapesFromSVG } from "./shapeTemplateUtil";
import { createShape, getCommonStruct } from "..";
import { ImageShape } from "../image";

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

  test("should parse asset files from SVG if it exists", () => {
    const data: ShapeTemplateInfo = {
      shapes: [createShape<ImageShape>(getCommonStruct, "image", { id: "a", assetId: "asset" })],
      docs: [],
    };
    const svg = createSVGSVGElement();
    const def = createSVGElement("def", {
      "data-folly-template": JSON.stringify(data),
    });
    svg.appendChild(def);

    const assetDef = createSVGElement("def", {});
    const assetImg = createSVGElement("image", {
      id: "asset",
      href: "data:image/png;base64,test",
    });
    assetDef.appendChild(assetImg);
    svg.appendChild(assetDef);
    svg.getElementById = (id: string) => (id === "asset" ? assetImg : svg);

    const res = parseTemplateShapesFromSVG(svg);
    expect(res?.assets).toHaveLength(1);
    expect(res?.assets?.[0][0]).toBe("asset");
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
