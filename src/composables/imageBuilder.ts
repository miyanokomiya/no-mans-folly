import { IRectangle } from "okageo";
import { CanvasCTX } from "../utils/types";

// Browsers usually have specific canvas size limitation.
// Ref: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size
const MAX_SIZE = 10000;

interface Option {
  render: (renderCtx: CanvasCTX) => void;
  range: IRectangle;
}

export function newImageBuilder({ render, range }: Option) {
  const canvas = createCanvas();
  const rate = Math.min(1, MAX_SIZE / Math.max(range.width, range.height));
  canvas.width = Math.ceil(range.width * rate);
  canvas.height = Math.ceil(range.height * rate);
  const renderCtx = canvas.getContext("2d")!;
  renderCtx.scale(rate, rate);
  renderCtx.translate(-Math.floor(range.x), -Math.floor(range.y));
  render(renderCtx);

  async function toBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob."));
          return;
        }

        resolve(blob);
      }, "image/png");
    });
  }

  function toDataURL(): string {
    return canvas.toDataURL("image/png");
  }

  return { toBlob, toDataURL };
}
export type ImageBuilder = ReturnType<typeof newImageBuilder>;

function createCanvas(): HTMLCanvasElement {
  return document.createElement("canvas");
}

interface SVGOption {
  render: (renderCtx: CanvasCTX) => Promise<SVGSVGElement>;
  range: IRectangle;
}

export function newSVGImageBuilder({ render, range }: SVGOption) {
  const canvas = createCanvas();
  const rate = Math.min(1, MAX_SIZE / Math.max(range.width, range.height));
  canvas.width = Math.ceil(range.width * rate);
  canvas.height = Math.ceil(range.height * rate);
  const renderCtx = canvas.getContext("2d")!;

  let elm: SVGSVGElement;
  async function procRender() {
    elm = await render(renderCtx);
    elm.setAttribute("viewBox", `${range.x} ${range.y} ${range.width} ${range.height}`);
    elm.setAttribute("width", `${range.width}`);
    elm.setAttribute("height", `${range.height}`);
  }

  async function toBlob() {
    if (!elm) {
      await procRender();
    }
    const svg = new XMLSerializer().serializeToString(elm);
    return new Blob([`${XML_PROLONG}\n${svg}`], { type: "image/svg+xml" });
  }

  /**
   * The url will be revoked right after "fn" finishes.
   */
  async function toDataURL(fn: (url: string) => Promise<void> | void) {
    const blob = await toBlob();
    const url = URL.createObjectURL(blob);
    await fn(url);
    URL.revokeObjectURL(url);
  }

  return { toBlob, toDataURL };
}
export type SVGImageBuilder = ReturnType<typeof newSVGImageBuilder>;

const XML_PROLONG = '<?xml version = "1.0" standalone = "no"?>';
