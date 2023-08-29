import { getShapeAffine } from "../../../../shapes";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { getDocLength, getTextLines } from "../../../../utils/textEditor";
import { handleHistoryEvent, handleStateEvent, translateOnSelection } from "../commons";
import { AppCanvasState } from "../core";

interface Option {
  id: string;
}

export function newTextEditingState(option: Option): AppCanvasState {
  let cursor = 0;

  return {
    getLabel: () => "TextEditing",
    onStart: async (ctx) => {
      ctx.startTextEditing();
      const doc = ctx.getDocumentMap()[option.id] ?? [];
      cursor = getDocLength(doc);
    },
    onEnd: async (ctx) => {
      ctx.stopTextEditing();
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "text-input":
          ctx.patchDocument(option.id, [{ retain: cursor }, { insert: event.data.value }]);
          cursor += event.data.value.length;
          ctx.setTmpShapeMap({});
          return;
        case "pointerdown":
          return translateOnSelection(ctx);
        case "keydown":
          return;
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        case "selection": {
          return translateOnSelection(ctx);
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return translateOnSelection(ctx);
        case "state":
          return handleStateEvent(ctx, event, ["DroppingNewShape", "LineReady"]);
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const shape = ctx.getShapeMap()[option.id];
      const doc = ctx.getDocumentMap()[option.id];
      if (!shape || !doc) return;

      const textLines = getTextLines(doc);
      const fontSize = 18;

      renderCtx.save();
      renderCtx.transform(...getShapeAffine(ctx.getShapeStruct, shape));
      renderCtx.font = `${fontSize}px Arial`;
      renderCtx.textBaseline = "top";
      renderCtx.textAlign = "left";

      let top = 0;
      let count = 0;
      textLines.forEach((text) => {
        if (count + text.length < cursor) {
          count += text.length + 1; // 1 is for line break
          top += fontSize;
          return;
        }

        const remain = cursor - count;
        const left = renderCtx.measureText(text.slice(0, remain)).width;
        applyStrokeStyle(renderCtx, { color: { r: 0, g: 0, b: 0, a: 1 } });
        renderCtx.lineWidth = 2;
        renderCtx.beginPath();
        renderCtx.moveTo(left, top);
        renderCtx.lineTo(left, top + fontSize);
        renderCtx.stroke();
      });
      renderCtx.restore();
    },
  };
}
