import type { AppCanvasState } from "../core";
import { newPanningState } from "../../commons";
import { handleStateEvent } from "../commons";
import { newDefaultState } from "../defaultState";
import { createShape } from "../../../../shapes";
import { IVec2 } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { TextShape } from "../../../../shapes/text";
import { newTextEditingState } from "./textEditingState";
import { newSelectionHubState } from "../selectionHubState";

export function newTextReadyState(): AppCanvasState {
  let vertex: IVec2 | undefined;

  return {
    getLabel: () => "TextReady",
    onStart: (ctx) => {
      ctx.setCursor();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              const point = event.data.point;
              vertex = point;

              const textshape = createShape<TextShape>(ctx.getShapeStruct, "text", {
                id: ctx.generateUuid(),
                p: vertex,
                findex: ctx.createLastIndex(),
              });
              ctx.addShapes([textshape]);
              ctx.selectShape(textshape.id);
              return () => newTextEditingState({ id: textshape.id });
            }
            case 1:
              return newPanningState;
            default:
              return;
          }
        case "pointerhover": {
          const point = event.data.current;
          vertex = point;
          ctx.setTmpShapeMap({});
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Escape":
              return newSelectionHubState;
            default:
              return;
          }
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        case "history":
          return newDefaultState;
        case "state":
          return handleStateEvent(ctx, event, ["Break", "DroppingNewShape", "LineReady"]);
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      if (!vertex) return;

      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const vertexSize = 8 * scale;
      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.beginPath();
      renderCtx.ellipse(vertex.x, vertex.y, vertexSize, vertexSize, 0, 0, Math.PI * 2);
      renderCtx.fill();
    },
  };
}
