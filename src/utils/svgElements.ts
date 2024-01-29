const SVG_URL = "http://www.w3.org/2000/svg";

type Attributes = { [name: string]: string } | null;

export function createSVGElement(tag: string, attributes: Attributes = null): SVGElement {
  const $el = document.createElementNS(SVG_URL, tag);
  return createElement($el, attributes);
}

function createElement($el: SVGElement, attributes: Attributes = null): SVGElement {
  for (const key in attributes) {
    $el.setAttribute(key, attributes[key].toString());
  }
  return $el;
}
