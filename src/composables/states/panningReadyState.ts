import { CanvasState } from "./commons";
import { newPanningState } from "./panningState";

export function newPanningReadyState(): CanvasState {
  let _panningState: CanvasState;

  return {
    getLabel: () => "PanningReady",
    onStart: (ctx) => {
      _panningState = newPanningState();
      ctx.setCursor("grab");
    },
    onEnd: (ctx) => {
      _panningState.onEnd?.(ctx);
      ctx.setCursor();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          _panningState.onStart?.(ctx);
          return;
        case "pointermove":
          return _panningState.handleEvent(ctx, event);
        case "pointerup":
          _panningState.onEnd?.(ctx);
          ctx.setCursor("grab");
          return;
        case "keyup":
          return { type: "break" };
      }
    },
  };
}
