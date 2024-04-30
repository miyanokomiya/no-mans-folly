import { CanvasState } from "./commons";

export function newPanningState(): CanvasState {
  return panningState;
}

const panningState: CanvasState = {
  getLabel: () => "Panning",
  onStart: (ctx) => {
    ctx.startDragging();
    ctx.setCursor("grabbing");
  },
  onEnd: (ctx) => {
    ctx.stopDragging();
    ctx.setCursor();
  },
  handleEvent: (ctx, event) => {
    switch (event.type) {
      case "pointermove":
        ctx.panView(event.data);
        return;
      case "pointerup":
        return { type: "break" };
    }
  },
};
