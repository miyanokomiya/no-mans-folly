export interface CanvasBank {
  beginCanvas(fn: (canvas: OffscreenCanvas) => void): void;
  size: () => number;
}

export function newCanvasBank(): CanvasBank {
  const canvasList: OffscreenCanvas[] = [];

  function borrowCanvas(): OffscreenCanvas {
    const item = canvasList.shift();
    if (item) return item;

    const canvas = new OffscreenCanvas(100, 100);
    return canvas;
  }

  function returnCanvas(canvas: OffscreenCanvas) {
    canvasList.unshift(canvas);
  }

  function beginCanvas(fn: (canvas: OffscreenCanvas) => void): void {
    const canvas = borrowCanvas();
    fn(canvas);
    returnCanvas(canvas);
  }

  return { beginCanvas, size: () => canvasList.length };
}
