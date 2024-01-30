import { AffineMatrix } from "okageo";
import { isIdentityAffine } from "./geometry";

const SVG_URL = "http://www.w3.org/2000/svg";

export type SVGElementInfo = { tag: string; attributes?: SVGAttributes };

export type SVGAttributes = { [name: string]: string | number | undefined } | null;

export function createSVGSVGElement(attributes: SVGAttributes = null): SVGSVGElement {
  return createSVGElement<SVGSVGElement>("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    "font-family": "Arial",
    ...attributes,
  });
}

export function createSVGElement<T extends SVGElement>(tag: string, attributes: SVGAttributes = null): T {
  const $el = document.createElementNS(SVG_URL, tag) as T;
  return createElement($el, attributes);
}

function createElement<T extends SVGElement>($el: T, attributes: SVGAttributes = null): T {
  for (const key in attributes) {
    const val = attributes[key];
    if (val != null) {
      $el.setAttribute(key, val.toString());
    }
  }
  return $el;
}

export function renderTransform(affine: AffineMatrix): string | undefined {
  return isIdentityAffine(affine) ? undefined : `matrix(${affine.join(" ")})`;
}
