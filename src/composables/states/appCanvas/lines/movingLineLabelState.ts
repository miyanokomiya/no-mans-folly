import type { AppCanvasState } from "../core";
import { translateOnSelection } from "../commons";
import { AffineMatrix, sub } from "okageo";
import { Shape } from "../../../../models";
import { mergeMap } from "../../../../utils/commons";
import { LineLabelHandler, newLineLabelHandler } from "../../../lineLabelHandler";
import { resizeShape } from "../../../../shapes";

interface Option {
  id: string;
}

export function newMovingLineLabelState(option: Option): AppCanvasState {
  let labelShape: Shape;
  let lineLabelHandler: LineLabelHandler;

  return {
    getLabel: () => "MovingLineLabel",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCursor("move");

      const shapeMap = ctx.getShapeMap();
      labelShape = shapeMap[option.id];

      lineLabelHandler = newLineLabelHandler({ ctx });
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
      ctx.setCursor();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const d = sub(event.data.current, event.data.start);
          const translate = d;
          const affine: AffineMatrix = [1, 0, 0, 1, translate.x, translate.y];
          const patch = { [labelShape.id]: resizeShape(ctx.getShapeStruct, labelShape, affine) };
          const labelPatch = lineLabelHandler.onModified(patch);
          ctx.setTmpShapeMap(mergeMap(patch, labelPatch));
          return;
        }
        case "pointerup": {
          const val = ctx.getTmpShapeMap();
          if (Object.keys(val).length > 0) {
            ctx.patchShapes(val);
          }
          return translateOnSelection(ctx);
        }
        case "selection": {
          return translateOnSelection(ctx);
        }
        default:
          return;
      }
    },
  };
}
