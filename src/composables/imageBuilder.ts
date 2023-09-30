import { IRectangle } from "okageo";

// Browsers usually have specific canvas size limitation.
// Ref: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size
const MAX_SIZE = 10000;

interface Option {
  render: (renderCtx: CanvasRenderingContext2D) => void;
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
