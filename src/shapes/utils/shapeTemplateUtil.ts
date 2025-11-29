import { Shape } from "../../models";
import { DocOutput } from "../../models/document";
import { isImageAssetShape } from "../image";
import { base64ToBlob, getBase64Type } from "../../utils/fileAccess";
import { createSVGElement } from "../../utils/svgElements";
import { isSheetImageShape } from "../sheetImage";

export const FOLLY_SVG_PREFIX = ".folly.svg";
const FOLLY_SVG_META_ATTRIBUTE = "data-folly-template";

export interface ShapeTemplateInfo {
  shapes: Shape[];
  docs: [id: string, doc: DocOutput][];
  assets?: [id: string, Blob][];
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

  // Gather new asset data from the SVG.
  const imageShapes = data.shapes.filter((s) => isImageAssetShape(s) || isSheetImageShape(s));
  const assetMap = new Map<string, Blob>();
  for (const imageShape of imageShapes) {
    const assetId = imageShape.assetId;
    if (!assetId || assetMap.has(assetId)) continue;

    const def = svg.getElementById(assetId);
    const base64 = def?.getAttribute("href");
    if (!base64) continue;

    const type = getBase64Type(base64);
    const blob = base64ToBlob(base64, type);
    assetMap.set(assetId, blob);
  }

  if (assetMap.size > 0) {
    data.assets = Array.from(assetMap.entries());
  }

  return data;
}

export function createTemplateShapeEmbedElement(data: ShapeTemplateInfo): SVGElement {
  return createSVGElement("def", {
    [FOLLY_SVG_META_ATTRIBUTE]: JSON.stringify(data),
  });
}
