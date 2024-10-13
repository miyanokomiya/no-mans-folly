import { CanvasState, handleCommonWheel } from "./commons";
import { newPanningState } from "./panningState";

export function newPreviewState(): CanvasState {
  return previewState;
}

const previewState: CanvasState = {
  getLabel: () => "Preview",
  handleEvent: (ctx, event) => {
    switch (event.type) {
      case "pointerdown":
        return { type: "stack-resume", getState: newPanningState };
      case "wheel":
        handleCommonWheel(ctx, event);
        return;
      default:
        return;
    }
  },
};
