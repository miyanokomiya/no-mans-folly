import { AffineMatrix } from "okageo";
import { isIdentityAffine } from "./geometry";

const SVG_URL = "http://www.w3.org/2000/svg";
const SVG_XLINK = "http://www.w3.org/1999/xlink";

export type SVGElementInfo = { tag: string; attributes?: SVGAttributes; children?: (SVGElementInfo | string)[] };

export type SVGAttributes = { [name: string]: string | number | undefined } | null;

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
): T {
  return createElement(
    document.createElementNS(SVG_URL, tag) as T,
    attributes,
    children?.map((c) => (isPlainText(c) ? new Text(c) : createSVGElement(c.tag, c.attributes, c.children))),
  );
}

function createElement<T extends SVGElement>(
  $el: T,
  attributes: SVGAttributes = null,
  children: (SVGElement | Text)[] = [],
): T {
  for (const key in attributes) {
    const val = attributes[key];
    if (val != null) {
      $el.setAttribute(key, val.toString());
    }
  }
  appendChildren($el, children);
  return $el;
}

export function renderTransform(affine: AffineMatrix): string | undefined {
  return isIdentityAffine(affine) ? undefined : `matrix(${affine.join(" ")})`;
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
