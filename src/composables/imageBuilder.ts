import { IRectangle } from "okageo";

interface Option {
  render: (renderCtx: CanvasRenderingContext2D) => void;
  range: IRectangle;
}

export function newImageBuilder({ render, range }: Option) {
  const canvas = createCanvas();
  canvas.width = Math.ceil(range.width);
  canvas.height = Math.ceil(range.height);
  const renderCtx = canvas.getContext("2d")!;
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
