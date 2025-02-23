import { CanvasCTX } from "../../utils/types";
import { CanvasState } from "./commons";

type Option = {
  render?: (ctx: any, renderCtx: CanvasCTX) => void;
};

export function newPanningState(option?: Option): CanvasState {
  return {
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
    render: option?.render,
  };
}
