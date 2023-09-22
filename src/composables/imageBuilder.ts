import { IRectangle } from "okageo";

interface Option {
  render: (renderCtx: CanvasRenderingContext2D) => void;
  range: IRectangle;
}

export function newImageBuilder({ render, range }: Option) {
  const canvas = createCanvas();
  canvas.width = range.width;
  canvas.height = range.height;
  const renderCtx = canvas.getContext("2d")!;
  renderCtx.translate(-range.x, -range.y);
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

  return { toBlob };
}
export type ImageBuilder = ReturnType<typeof newImageBuilder>;

function createCanvas(): HTMLCanvasElement {
  return document.createElement("canvas");
}
