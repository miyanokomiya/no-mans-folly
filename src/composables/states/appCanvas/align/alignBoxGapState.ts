import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { AlignBoxHandler, AlignBoxGapHitResult, newAlignBoxHandler } from "../../../alignHandler";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { AlignBoxShape } from "../../../../shapes/align/alignBox";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { IVec2 } from "okageo";

interface Option {
  type: AlignBoxGapHitResult["type"];
  alignBoxId: string;
}

export function newAlignBoxGapState(option: Option): AppCanvasState {
  const alignBoxId = option.alignBoxId;
  let alignBoxHandler: AlignBoxHandler;
  let nextGap: IVec2 | undefined;

  function initHandler(ctx: AppCanvasStateContext) {
    alignBoxHandler = newAlignBoxHandler({
      getShapeComposite: ctx.getShapeComposite,
      alignBoxId: alignBoxId,
    });
  }

  return {
    getLabel: () => "AlignBoxGap",
    onStart: (ctx) => {
      initHandler(ctx);
      ctx.startDragging();
      ctx.setCommandExams([COMMAND_EXAM_SRC.GAP_BOTH]);
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setCommandExams();
      ctx.setTmpShapeMap({});
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const shapeComposite = ctx.getShapeComposite();

          nextGap = alignBoxHandler.getModifiedGap(option.type, event.data.start, event.data.current, {
            both: event.data.shift,
          });
          if (nextGap) {
            const src = shapeComposite.shapeMap[alignBoxId] as AlignBoxShape;
            const patch: Partial<AlignBoxShape> = {};
            if (nextGap.x !== src.gapC) {
              patch.gapC = nextGap.x;
            }
            if (nextGap.y !== src.gapR) {
              patch.gapR = nextGap.y;
            }
            const layoutPatch = getPatchByLayouts(shapeComposite, { update: { [alignBoxId]: patch } });
            ctx.setTmpShapeMap(layoutPatch);
          } else {
            ctx.setTmpShapeMap({});
          }
          return;
        }
        case "pointerup": {
          const val = ctx.getTmpShapeMap();
          if (val) {
            ctx.patchShapes(val);
          }
          return newSelectionHubState;
        }
        case "selection": {
          return newSelectionHubState;
        }
        case "shape-updated": {
          if (event.data.keys.has(alignBoxId)) {
            initHandler(ctx);
          }
          return;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      alignBoxHandler.renderModifiedGap(renderCtx, style, ctx.getScale(), nextGap);
    },
  };
}
