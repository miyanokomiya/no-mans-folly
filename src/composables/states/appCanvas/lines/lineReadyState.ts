import type { AppCanvasState } from "../core";
import { newPanningState } from "../../commons";
import { handleStateEvent, translateOnSelection } from "../commons";
import { newDefaultState } from "../defaultState";
import { newLineDrawingState } from "./lineDrawingState";
import { createShape } from "../../../../shapes";
import { LineShape } from "../../../../shapes/line";

interface Option {
  type: string;
}

export function newLineReadyState(_option: Option): AppCanvasState {
  return {
    getLabel: () => "LineReady",
    onStart: async (ctx) => {
      ctx.setCursor("crosshair");
    },
    onEnd: async (ctx) => {
      ctx.setCursor();
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              const lineshape = createShape<LineShape>(ctx.getShapeStruct, "line", {
                id: ctx.generateUuid(),
                p: event.data.point,
                q: event.data.point,
              });
              return () => newLineDrawingState({ shape: lineshape });
            }
            case 1:
              return newPanningState;
            default:
              return;
          }
        case "keydown":
          switch (event.data.key) {
            case "Escape":
              return translateOnSelection(ctx);
            default:
              return;
          }
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        case "history":
          return newDefaultState;
        case "state":
          return handleStateEvent(ctx, event, ["Break", "DroppingNewShape"]);
        default:
          return;
      }
    },
  };
}
