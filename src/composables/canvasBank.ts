export interface CanvasBank {
  beginCanvas(fn: (canvas: HTMLCanvasElement) => void): void;
  size: () => number;
}

export function newCanvasBank(): CanvasBank {
  const canvasList: HTMLCanvasElement[] = [];

  function borrowCanvas(): HTMLCanvasElement {
    const item = canvasList.shift();
    if (item) return item;

    const canvas = document.createElement("canvas");
    return canvas;
  }

  function returnCanvas(canvas: HTMLCanvasElement) {
    canvasList.unshift(canvas);
  }

  function beginCanvas(fn: (canvas: HTMLCanvasElement) => void): void {
    const canvas = borrowCanvas();
    fn(canvas);
    returnCanvas(canvas);
  }

  return { beginCanvas, size: () => canvasList.length };
}
