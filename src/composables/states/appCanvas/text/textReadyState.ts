import type { AppCanvasState } from "../core";
import { handleCommonWheel, handleStateEvent } from "../commons";
import { newDefaultState } from "../defaultState";
import { createShape } from "../../../../shapes";
import { IVec2, add } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { TextShape } from "../../../../shapes/text";
import { newTextEditingState } from "./textEditingState";
import { newSelectionHubState } from "../selectionHubState";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../../shapeSnapping";
import { isLineShape } from "../../../../shapes/line";
import { TAU } from "../../../../utils/geometry";
import { getInitialOutput } from "../../../../utils/textEditor";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";

export function newTextReadyState(): AppCanvasState {
  let vertex: IVec2 | undefined;
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;

  return {
    getLabel: () => "TextReady",
    onStart: (ctx) => {
      ctx.setCursor();

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const snappableLines = shapeComposite.getShapesOverlappingRect(
        Object.values(shapeMap).filter((s) => isLineShape(s)),
        ctx.getViewRect(),
      );
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableLines.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });

      vertex = ctx.getCursorPoint();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              const point = event.data.point;
              snappingResult = event.data.options.ctrl ? undefined : shapeSnapping.testPoint(point);
              vertex = snappingResult ? add(point, snappingResult.diff) : point;

              const textshape = createShape<TextShape>(ctx.getShapeStruct, "text", {
                id: ctx.generateUuid(),
                p: vertex,
                findex: ctx.createLastIndex(),
              });
              // Better create initial doc here.
              // Otherwise, history operations for upcoming text editing don't work well for some reason.
              ctx.addShapes([textshape], { [textshape.id]: getInitialOutput() });
              ctx.selectShape(textshape.id);
              return () => newTextEditingState({ id: textshape.id });
            }
            case 1:
              return () => newPointerDownEmptyState(event.data.options);
            default:
              return;
          }
        case "pointerhover": {
          const point = event.data.current;
          snappingResult = event.data.ctrl ? undefined : shapeSnapping.testPoint(point);
          vertex = snappingResult ? add(point, snappingResult.diff) : point;
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
          handleCommonWheel(ctx, event);
          return;
        case "history":
          return newDefaultState;
        case "state":
          return handleStateEvent(ctx, event, ["Break", "DroppingNewShape", "LineReady", "RectSelectReady"]);
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
      renderCtx.ellipse(vertex.x, vertex.y, vertexSize, vertexSize, 0, 0, TAU);
      renderCtx.fill();

      if (snappingResult) {
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
        });
      }
    },
  };
}
