import {
  AffineMatrix,
  getRectCenter,
  IRectangle,
  parsePathSegmentRaws,
  parseTransform,
  PathSegmentRaw,
  pathSegmentRawsToString,
  rotatePath,
  slidePath,
} from "okageo";
import { isIdentityAffine, roundFloatingError } from "./geometry";

const SVG_URL = "http://www.w3.org/2000/svg";
const SVG_XLINK = "http://www.w3.org/1999/xlink";

export type SVGElementInfo = { tag: string; attributes?: SVGAttributes; children?: (SVGElementInfo | string)[] };

export type SVGAttributes = { [name: string]: string | number | undefined } | null;

export type SVGElementOption = { roundFloat?: boolean };

export function createSVGSVGElement(attributes: SVGAttributes = null): SVGSVGElement {
  return createSVGElement<SVGSVGElement>("svg", {
    xmlns: SVG_URL,
    "xmlns:xlink": SVG_XLINK,
    "font-family": "Arial",
    ...attributes,
  });
}

export function createSVGElement<T extends SVGElement>(
  tag: string,
  attributes: SVGAttributes = null,
  children: (SVGElementInfo | string)[] = [],
  option?: SVGElementOption,
): T {
  return createElement(
    document.createElementNS(SVG_URL, tag) as T,
    attributes,
    children?.map((c) => (isPlainText(c) ? new Text(c) : createSVGElement(c.tag, c.attributes, c.children, option))),
    option,
  );
}

function createElement<T extends SVGElement>(
  $el: T,
  attributes: SVGAttributes = null,
  children: (SVGElement | Text)[] = [],
  option?: SVGElementOption,
): T {
  for (const key in attributes) {
    const val = attributes[key];
    if (val != null) {
      switch (key) {
        case "x":
        case "y":
        case "cx":
        case "cy":
        case "rx":
        case "ry":
        case "r":
        case "width":
        case "height": {
          $el.setAttribute(key, renderNumber(val.toString(), option));
          break;
        }
        case "d": {
          $el.setAttribute(key, renderD(val.toString(), option));
          break;
        }
        case "transform": {
          const value = renderTransform(parseTransform(val.toString()), option);
          if (value) {
            $el.setAttribute(key, value);
          }
          break;
        }
        default: {
          $el.setAttribute(key, val.toString());
          break;
        }
      }
    }
  }
  appendChildren($el, children);
  return $el;
}

function renderNumber(v: string, option?: SVGElementOption): string {
  if (!option?.roundFloat) return v;
  return roundFloatingError(parseFloat(v)).toString();
}

function renderD(d: string, option?: SVGElementOption): string {
  if (!option?.roundFloat) return d;

  const segs = parsePathSegmentRaws(d);
  const rounded = segs.map(
    (seg) =>
      seg.map((v) => (typeof v === "string" || typeof v === "boolean" ? v : roundFloatingError(v))) as PathSegmentRaw,
  );
  return pathSegmentRawsToString(rounded);
}

export function renderTransform(affine: AffineMatrix, option?: SVGElementOption): string | undefined {
  if (isIdentityAffine(affine)) return undefined;

  const adjusted = option?.roundFloat ? affine.map((v) => roundFloatingError(v)) : affine;
  return `matrix(${adjusted.join(" ")})`;
}

function appendChildren($el: SVGElement, $children: (SVGElement | Text)[]) {
  const $fragment = document.createDocumentFragment();
  for (let i = 0; i < $children.length; i++) {
    const item = $children[i];
    $fragment.appendChild(item);
  }
  $el.appendChild($fragment);
}

export function isPlainText(elm: unknown): elm is string {
  return typeof elm === "string";
}

export function getColorAttributes(
  type: "fill" | "stroke",
  val?: [hex: string, alpha: number],
): SVGAttributes | undefined {
  return val ? { [type]: val[0], [`${type}-opacity`]: val[1] === 1 ? undefined : val[1] } : undefined;
}

export function applyRotatedRectTransformToRawPath(
  rect: IRectangle,
  rotation: number,
  rawPath: PathSegmentRaw[],
): PathSegmentRaw[] {
  const c = getRectCenter(rect);
  return slidePath(rotatePath(slidePath(rawPath, { x: -rect.width / 2, y: -rect.height / 2 }), rotation), {
    x: c.x,
    y: c.y,
  });
}
