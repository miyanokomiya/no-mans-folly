import { Shape } from "../models";
import { DocOutput } from "../models/document";
import { createSVGElement } from "./svgElements";

export const FOLLY_SVG_PREFIX = ".folly.svg";
const FOLLY_SVG_META_ATTRIBUTE = "data-folly-template";

export interface ShapeTemplateInfo {
  shapes: Shape[];
  docs: [id: string, doc: DocOutput][];
}

export function parseTemplateShapes(svgText: string): ShapeTemplateInfo | undefined {
  const parser = new DOMParser();
  const svg = parser.parseFromString(svgText, "image/svg+xml").getElementsByTagName("svg")[0];
  if (!svg) return;

  return parseTemplateShapesFromSVG(svg);
}

export function parseTemplateShapesFromSVG(svg: SVGSVGElement): ShapeTemplateInfo | undefined {
  const meta = svg.querySelector(`[${FOLLY_SVG_META_ATTRIBUTE}]`)?.getAttribute(FOLLY_SVG_META_ATTRIBUTE);
  if (!meta) return;

  const data = JSON.parse(meta) as ShapeTemplateInfo;
  if (data.shapes.length === 0) return;

  return data;
}

export function createTemplateShapeEmbedElement(data: ShapeTemplateInfo): SVGElement {
  return createSVGElement("def", {
    [FOLLY_SVG_META_ATTRIBUTE]: JSON.stringify(data),
  });
}
