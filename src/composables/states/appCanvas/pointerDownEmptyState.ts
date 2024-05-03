import { BoundingBox } from "../../boundingBox";
import { newPanningState } from "../panningState";
import type { AppCanvasState } from "./core";
import { newRectangleSelectingState } from "./ractangleSelectingState";
import { newSelectionHubState } from "./selectionHubState";

interface Option {
  ctrl?: boolean; // when true, pass "keepSelection: true" to "RectangleSelectingState"
  button?: number;
  boundingBox?: BoundingBox; // when passed, moves to "SelectionHub" after panning
}

export function newPointerDownEmptyState(option?: Option): AppCanvasState {
  let timestampForLeftPan = 0;

  return {
    getLabel: () => "PointerDownEmpty",
    onStart(ctx) {
      const setting = ctx.getUserSetting();

      if (option?.button === 1) {
        switch (setting.leftDragAction) {
          case "pan":
            return () => newRectangleSelectingState({ keepSelection: option?.ctrl });
          default:
            return { type: "stack-resume", getState: newPanningState };
        }
      }

      switch (setting.leftDragAction) {
        case "pan": {
          timestampForLeftPan = Date.now();
          return { type: "stack-resume", getState: newPanningState };
        }
        default:
          return () => newRectangleSelectingState({ keepSelection: option?.ctrl });
      }
    },
    onResume(ctx) {
      const setting = ctx.getUserSetting();
      const now = Date.now();
      // Clear selection when left-panning finished shortly.
      if (setting.leftDragAction === "pan" && now - timestampForLeftPan < 150) {
        ctx.clearAllSelected();
      }

      return option?.boundingBox ? () => newSelectionHubState({ boundingBox: option.boundingBox }) : { type: "break" };
    },
    handleEvent() {},
  };
}
