import { Shape } from "../models";
import { DocOutput } from "../models/document";

export const FOLLY_SVG_PREFIX = ".folly.svg";
export const FOLLY_SVG_META_ATTRIBUTE = "data-folly-template";

export interface ShapeTemplateInfo {
  shapes: Shape[];
  docs: [id: string, doc: DocOutput][];
}

export function parseTemplateShapes(svgText: string): ShapeTemplateInfo | undefined {
  const parser = new DOMParser();
  const svg = parser.parseFromString(svgText, "image/svg+xml").getElementsByTagName("svg")[0];
  if (!svg) return;

  const meta = svg.querySelector(`[${FOLLY_SVG_META_ATTRIBUTE}]`)?.getAttribute(FOLLY_SVG_META_ATTRIBUTE);
  if (!meta) return;

  const data = JSON.parse(meta) as ShapeTemplateInfo;
  if (data.shapes.length === 0) return;

  return data;
}
