import { IVec2 } from "okageo";
import { createShape } from "../../../shapes";
import { EmojiShape } from "../../../shapes/emoji";
import type { AppCanvasState } from "./core";
import { newSingleSelectedState } from "./singleSelectedState";
import { handleCommonWheel } from "../commons";

export function newEmojiPickerState(): AppCanvasState {
  let p: IVec2;

  return {
    getLabel: () => "EmojiPicker",
    onStart: (ctx) => {
      ctx.clearAllSelected();
      p = ctx.getCursorPoint();
      ctx.setShowEmojiPicker(true, p);
    },
    onEnd: (ctx) => {
      ctx.setShowEmojiPicker(false);
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "text-input": {
          const shape = createShape<EmojiShape>(ctx.getShapeComposite().getShapeStruct, "emoji", {
            id: ctx.generateUuid(),
            findex: ctx.createLastIndex(),
            p,
            emoji: event.data.value,
          });

          ctx.addShapes([shape]);
          ctx.selectShape(shape.id);
          return ctx.states.newSelectionHubState;
        }
        case "pointerdown":
          return newSingleSelectedState;
        case "close-emoji-picker":
          return ctx.states.newSelectionHubState;
        case "wheel":
          handleCommonWheel(ctx, event);
          return;
        default:
          return;
      }
    },
  };
}
