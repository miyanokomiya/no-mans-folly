import type { AppCanvasState } from "../core";
import { getCommonAcceptableEvents, handleStateEvent } from "../commons";
import { getLinePath, isLineShape, LineShape } from "../../../../shapes/line";
import { handleCommonWheel } from "../../commons";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { sub } from "okageo";
import { getD2, TAU } from "../../../../utils/geometry";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { canConcatLines, getPatchByCombineLines } from "../../../../shapes/utils/line";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { applyPath } from "../../../../utils/renderer";

const VERTEX_THRESHOLD = 8;

interface Option {
  lineShape: LineShape;
  tail?: boolean;
}

type CandidateInfo = [id: string, tail: boolean];

export function newLineCombineState(option: Option): AppCanvasState {
  let candidateInfo: CandidateInfo | undefined;
  let candidateLines: LineShape[];

  return {
    getLabel: () => "LineConcat",
    onStart: (ctx) => {
      ctx.setCommandExams([COMMAND_EXAM_SRC.COMBINE_LINES]);
      const shapeComposite = ctx.getShapeComposite();
      candidateLines = shapeComposite.shapes.filter(
        (s): s is LineShape => isLineShape(s) && canConcatLines(option.lineShape, s),
      );
    },
    onEnd: (ctx) => {
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              if (!candidateInfo) return ctx.states.newSelectionHubState;

              const shapeComposite = ctx.getShapeComposite();
              const candidate = shapeComposite.shapeMap[candidateInfo[0]];
              if (!candidate) return ctx.states.newSelectionHubState;

              const result = getPatchByCombineLines(
                option.lineShape,
                candidate as LineShape,
                option.tail ? (candidateInfo[1] ? 3 : 2) : candidateInfo[1] ? 1 : 0,
              );
              const patch: Partial<LineShape> = { ...result };
              ctx.updateShapes({
                update: {
                  [option.lineShape.id]: patch,
                },
                delete: [candidate.id],
              });

              return ctx.states.newSelectionHubState;
            }
            case 1:
              return { type: "stack-resume", getState: () => ctx.states.newPointerDownEmptyState(event.data.options) };
            default:
              return ctx.states.newSelectionHubState;
          }
        case "pointerhover": {
          const thresholdD2 = (VERTEX_THRESHOLD * ctx.getScale()) ** 2;
          const p = event.data.current;
          let nextInfo: CandidateInfo | undefined;

          // Prioritize front ones.
          for (let i = 0; i < candidateLines.length; i++) {
            const s = candidateLines[candidateLines.length - 1 - i];
            const vertices = getLinePath(s);
            if (getD2(sub(p, vertices[0])) < thresholdD2) {
              nextInfo = [s.id, false];
              break;
            }
            if (getD2(sub(p, vertices[vertices.length - 1])) < thresholdD2) {
              nextInfo = [s.id, true];
              break;
            }
          }
          if (candidateInfo === nextInfo) return;

          candidateInfo = nextInfo;
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
      const threshold = VERTEX_THRESHOLD * scale;

      applyFillStyle(renderCtx, {
        color: style.selectionSecondaly,
      });
      const targetVertices = getLinePath(option.lineShape);
      const targetVertex = targetVertices[option.tail ? targetVertices.length - 1 : 0];
      renderCtx.beginPath();
      renderCtx.arc(targetVertex.x, targetVertex.y, threshold, 0, TAU);
      renderCtx.fill();

      const shapeComposite = ctx.getShapeComposite();

      applyFillStyle(renderCtx, {
        color: style.selectionPrimary,
      });
      candidateLines.forEach((s) => {
        const vertices = getLinePath(s);
        [vertices[0], vertices[vertices.length - 1]].forEach((p) => {
          renderCtx.beginPath();
          renderCtx.arc(p.x, p.y, threshold, 0, TAU);
          renderCtx.fill();
        });
      });

      if (!candidateInfo) return;

      const candidate = shapeComposite.shapeMap[candidateInfo[0]];
      if (!candidate) return;

      const candidateVertices = getLinePath(candidate as LineShape);
      const candidateVertex = candidateVertices[candidateInfo[1] ? candidateVertices.length - 1 : 0];

      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * scale, dash: "short" });
      renderCtx.beginPath();
      applyPath(renderCtx, [targetVertex, candidateVertex]);
      renderCtx.stroke();

      applyFillStyle(renderCtx, {
        color: style.selectionSecondaly,
      });
      renderCtx.beginPath();
      renderCtx.arc(candidateVertex.x, candidateVertex.y, threshold, 0, TAU);
      renderCtx.fill();
    },
  };
}
