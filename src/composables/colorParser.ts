import { Color } from "../models";

/**
 * This depends on OffscreenCanvas, which is not available in Node.js.
 */
export function newColorParser() {
  const canvas = new OffscreenCanvas(1, 1);
  const renderCtx = canvas.getContext("2d", { willReadFrequently: true });
  const cache = new Map<string, Color>();

  function parseColor(str: string): Color {
    const cached = cache.get(str);
    if (cached) return cached;
    if (!renderCtx) return { r: 0, g: 0, b: 0, a: 1 };

    renderCtx.fillStyle = str;
    renderCtx.fillRect(0, 0, 1, 1);
    const pixel = renderCtx.getImageData(0, 0, 1, 1).data;
    const color = { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
    cache.set(str, color);
    return color;
  }

  return { parseColor };
}
