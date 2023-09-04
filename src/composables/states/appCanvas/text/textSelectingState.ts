import { applyAffine } from "okageo";
import { getShapeTextBounds } from "../../../../shapes";
import { TextEditorController } from "../../../textEditor";
import { translateOnSelection } from "../commons";
import { AppCanvasState } from "../core";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";

interface Option {
  id: string;
  textEditorController: TextEditorController;
}

export function newTextSelectingState(option: Option): AppCanvasState {
  const textEditorController = option.textEditorController;
  let textBounds: ReturnType<typeof getShapeTextBounds>;

  return {
    getLabel: () => "TextEditing",
    onStart: async (ctx) => {
      ctx.startDragging();
      const shape = ctx.getShapeMap()[option.id];
      textBounds = getShapeTextBounds(ctx.getShapeStruct, shape);
    },
    onEnd: async (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const start = textEditorController.getLocationAt(applyAffine(textBounds.affineReverse, event.data.start));
          const current = textEditorController.getLocationAt(applyAffine(textBounds.affineReverse, event.data.current));
          const index0 = textEditorController.getLocationIndex(start);
          const index1 = textEditorController.getLocationIndex(current);
          const from = Math.min(index0, index1);
          const to = Math.max(index0, index1);

          textEditorController.setCursor(from, to - from);
          ctx.setTmpShapeMap({});
          return;
        }
        case "pointerup": {
          return { type: "break" };
        }
        case "shape-updated": {
          const shape = ctx.getShapeMap()[option.id];
          if (!shape) return translateOnSelection(ctx);

          textBounds = getShapeTextBounds(ctx.getShapeStruct, shape);
          textEditorController.setDoc(ctx.getDocumentMap()[option.id], textBounds.range);
          return;
        }
        case "selection": {
          return translateOnSelection(ctx);
        }
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const shape = ctx.getShapeMap()[option.id];
      if (!shape) return;

      renderCtx.save();
      renderCtx.transform(...textBounds.affine);

      const style = ctx.getStyleScheme();
      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * ctx.getScale() });
      renderCtx.beginPath();
      renderCtx.strokeRect(textBounds.range.x, textBounds.range.x, textBounds.range.width, textBounds.range.height);
      renderCtx.stroke();

      textEditorController.render(renderCtx);
      renderCtx.restore();
    },
  };
}
