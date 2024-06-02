import type { AppCanvasState } from "../core";
import { handleHistoryEvent } from "../commons";
import { LineShape, getEdges, getLinePath, patchBodyVertex } from "../../../../shapes/line";
import { getDistance, getInner, getPedal, sub } from "okageo";
import { newSelectionHubState } from "../selectionHubState";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { ElbowLineHandler, newElbowLineHandler } from "../../../elbowLineHandler";

interface Option {
  lineShape: LineShape;
  index: number;
}

export function newMovingElbowSegmentState(option: Option): AppCanvasState {
  const targetSegment = getEdges(option.lineShape)[option.index];
  const srcBodyItem = option.lineShape.body?.[option.index - 1];
  let elbowHandler: ElbowLineHandler;

  return {
    getLabel: () => "MovingElbowSegment",
    onStart: (ctx) => {
      if (option.lineShape.lineType !== "elbow") return newSelectionHubState;

      ctx.startDragging();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_SNAP]);
      elbowHandler = newElbowLineHandler(ctx);
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setCommandExams();
      ctx.setTmpShapeMap({});
    },
    handleEvent: (ctx, event) => {
      if (!srcBodyItem) return newSelectionHubState;

      switch (event.type) {
        case "pointermove": {
          const p = event.data.current;
          const elbow = srcBodyItem.elbow;
          const pedal = getPedal(p, targetSegment);

          const vertices = getLinePath(option.lineShape);
          const prev = vertices[option.index - 1];
          const origin = elbow?.p ?? targetSegment[0];
          const sign = Math.sign(getInner(sub(origin, prev), sub(p, pedal)));
          const d = sign * getDistance(pedal, p) + (elbow?.d ?? 0);

          const nextElbow = { ...elbow, d, p: origin };
          let patch = patchBodyVertex(option.lineShape, option.index - 1, { ...srcBodyItem, elbow: nextElbow });
          patch = { ...patch, body: elbowHandler.optimizeElbow({ ...option.lineShape, ...patch }) };

          ctx.setTmpShapeMap(
            getPatchAfterLayouts(ctx.getShapeComposite(), { update: { [option.lineShape.id]: patch } }),
          );
          return;
        }
        case "pointerup": {
          const tmpMap = ctx.getTmpShapeMap();
          if (Object.keys(tmpMap).length > 0) {
            ctx.patchShapes(tmpMap);
          }
          return newSelectionHubState;
        }
        case "selection": {
          return newSelectionHubState;
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return newSelectionHubState;
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const style = ctx.getStyleScheme();
      applyStrokeStyle(renderCtx, { color: style.selectionPrimary });
      scaleGlobalAlpha(renderCtx, 0.5, () => {
        renderCtx.beginPath();
        renderCtx.moveTo(targetSegment[0].x, targetSegment[0].y);
        renderCtx.lineTo(targetSegment[1].x, targetSegment[1].y);
        renderCtx.stroke();
      });
    },
  };
}
