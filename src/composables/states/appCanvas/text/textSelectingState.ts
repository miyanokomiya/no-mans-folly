import { applyAffine } from "okageo";
import { getShapeTextBounds } from "../../../../shapes";
import { TextEditorController } from "../../../textEditor";
import { AppCanvasState } from "../core";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { newSelectionHubState } from "../selectionHubState";

interface Option {
  id: string;
  textEditorController: TextEditorController;
}

export function newTextSelectingState(option: Option): AppCanvasState {
  const textEditorController = option.textEditorController;
  let textBounds: ReturnType<typeof getShapeTextBounds>;

  return {
    getLabel: () => "TextEditing",
    onStart: (ctx) => {
      ctx.startDragging();
      const shape = ctx.getShapeComposite().shapeMap[option.id];
      textBounds = getShapeTextBounds(ctx.getShapeStruct, shape);
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const start = textEditorController.getLocationAt(applyAffine(textBounds.affineReverse, event.data.start));
          const current = textEditorController.getLocationAt(applyAffine(textBounds.affineReverse, event.data.current));
          const from = textEditorController.getLocationIndex(start);
          const to = textEditorController.getLocationIndex(current);

          textEditorController.setCursor(from, to - from);
          ctx.redraw();
          return;
        }
        case "pointerup": {
          return { type: "break" };
        }
        case "shape-updated": {
          const shape = ctx.getShapeComposite().shapeMap[option.id];
          if (!shape) return newSelectionHubState;

          textBounds = getShapeTextBounds(ctx.getShapeStruct, shape);
          textEditorController.setDoc(ctx.getDocumentMap()[option.id], textBounds.range);
          return;
        }
        case "selection": {
          return newSelectionHubState;
        }
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const shape = ctx.getShapeComposite().shapeMap[option.id];
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
