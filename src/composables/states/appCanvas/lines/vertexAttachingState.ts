import type { AppCanvasState } from "../core";
import { getCommonAcceptableEvents, getSnappableCandidates, handleStateEvent } from "../commons";
import { getLinePath, isLineShape, LineShape, patchVertices } from "../../../../shapes/line";
import { handleCommonWheel } from "../../commons";
import { findBackward } from "../../../../utils/commons";
import { applyPath, scaleGlobalAlpha } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { ConnectionPoint } from "../../../../models";
import { IVec2 } from "okageo";
import { TAU } from "../../../../utils/geometry";
import { COMMAND_EXAM_SRC } from "../commandExams";

interface Option {
  lineShape: LineShape;
  index?: number;
}

export function newVertexAttachingState(option: Option): AppCanvasState {
  let snappableIdSet = new Set<string>();
  let candidateId: string | undefined;
  let verticesInfo: [index: number, IVec2][];

  return {
    getLabel: () => "VertexAttaching",
    onStart: (ctx) => {
      ctx.setCommandExams([COMMAND_EXAM_SRC.ATTACH_LINE_VERTEX]);

      if (option.index === undefined) {
        verticesInfo = getLinePath(option.lineShape).map((p, i) => [i, p]);
      } else {
        verticesInfo = [[option.index, getLinePath(option.lineShape)[option.index]]];
      }
      const snappableCandidates = getSnappableCandidates(ctx, [option.lineShape.id]).filter((s) => !isLineShape(s));
      snappableIdSet = new Set(snappableCandidates.map((s) => s.id));
    },
    onEnd: (ctx) => {
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              const shapeComposite = ctx.getShapeComposite();
              const candidate = candidateId ? shapeComposite.shapeMap[candidateId] : undefined;
              if (!candidate) return ctx.states.newSelectionHubState;

              const patchInfo = verticesInfo.map<[index: number, p: IVec2, c: ConnectionPoint]>((info) => [
                info[0],
                info[1],
                {
                  rate: shapeComposite.getLocationRateOnShape(candidate, info[1]),
                  id: candidate.id,
                },
              ]);
              const patch = patchVertices(option.lineShape, patchInfo);
              ctx.patchShapes({
                [option.lineShape.id]: patch,
              });

              return ctx.states.newSelectionHubState;
            }
            case 1:
              return { type: "stack-resume", getState: () => ctx.states.newPointerDownEmptyState(event.data.options) };
            default:
              return ctx.states.newSelectionHubState;
          }
        case "pointerhover": {
          const p = event.data.current;
          const shapeComposite = ctx.getShapeComposite();
          const candidate = findBackward(shapeComposite.shapes, (s) => {
            if (!snappableIdSet.has(s.id)) return false;
            return shapeComposite.isPointOn(s, p);
          });
          candidateId = candidate?.id;
          ctx.redraw();
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Escape":
              return ctx.states.newSelectionHubState;
            default:
              return;
          }
        case "wheel":
          handleCommonWheel(ctx, event);
          return;
        case "history":
          return ctx.states.newSelectionHubState;
        case "state":
          return handleStateEvent(ctx, event, getCommonAcceptableEvents());
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();

      const shapeComposite = ctx.getShapeComposite();
      const candidate = candidateId ? shapeComposite.shapeMap[candidateId] : undefined;
      if (candidate) {
        const path = shapeComposite.getLocalRectPolygon(candidate);
        renderCtx.beginPath();
        applyPath(renderCtx, path, true);
        scaleGlobalAlpha(renderCtx, 0.1, () => {
          applyFillStyle(renderCtx, {
            color: style.selectionPrimary,
          });
          renderCtx.fill();
        });
        applyStrokeStyle(renderCtx, {
          color: style.selectionPrimary,
          width: 3 * scale,
          dash: "short",
        });
        renderCtx.stroke();
      }

      applyFillStyle(renderCtx, {
        color: style.selectionSecondaly,
      });
      verticesInfo.forEach(([, vertex]) => {
        renderCtx.beginPath();
        renderCtx.arc(vertex.x, vertex.y, 8 * scale, 0, TAU);
        renderCtx.fill();
      });
    },
  };
}
