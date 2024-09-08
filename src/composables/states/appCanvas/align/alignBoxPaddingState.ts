import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { AlignBoxHandler, AlignBoxPaddingHitResult, newAlignBoxHandler } from "../../../alignHandler";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { AlignBoxShape } from "../../../../shapes/align/alignBox";
import { BoxValues4 } from "../../../../models";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { newShapeComposite } from "../../../shapeComposite";

interface Option {
  type: AlignBoxPaddingHitResult["type"];
  alignBoxId: string;
}

export function newAlignBoxPaddingState(option: Option): AppCanvasState {
  const alignBoxId = option.alignBoxId;
  let alignBoxHandler: AlignBoxHandler;
  let nextPadding: BoxValues4 | undefined;

  function initHandler(ctx: AppCanvasStateContext) {
    alignBoxHandler = newAlignBoxHandler({
      getShapeComposite: ctx.getShapeComposite,
      alignBoxId: alignBoxId,
    });
  }

  return {
    getLabel: () => "AlignBoxPadding",
    onStart: (ctx) => {
      initHandler(ctx);
      ctx.startDragging();
      ctx.setCommandExams([COMMAND_EXAM_SRC.PADDING_BOTH_SIDES, COMMAND_EXAM_SRC.PADDING_ALL_SIDES]);
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

          nextPadding = alignBoxHandler.getModifiedPadding(option.type, event.data.start, event.data.current, {
            bothSides: event.data.shift,
            allSides: event.data.alt,
          });
          if (nextPadding) {
            const patch: Partial<AlignBoxShape> = { padding: nextPadding };
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
          return ctx.states.newSelectionHubState;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
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
      const shapeComposite = ctx.getShapeComposite();

      // Since padding anchors' position deeply depend on layout result, recreating the handler here is easy workaround for rendering.
      const tmpShapeComposite = newShapeComposite({
        shapes: [shapeComposite.mergedShapeMap[alignBoxId]],
        getStruct: shapeComposite.getShapeStruct,
      });
      const tmpAlignBoxHandler = newAlignBoxHandler({
        getShapeComposite: () => tmpShapeComposite,
        alignBoxId: alignBoxId,
      });
      tmpAlignBoxHandler.renderModifiedPadding(renderCtx, style, ctx.getScale(), nextPadding);
    },
  };
}
