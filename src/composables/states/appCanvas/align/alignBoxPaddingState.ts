import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { BoundingBox } from "../../../boundingBox";
import { AlignBoxHandler, AlignBoxPaddingHitResult, newAlignBoxHandler } from "../../../alignHandler";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { AlignBoxShape } from "../../../../shapes/align/alignBox";
import { BoxValues4 } from "../../../../models";
import { COMMAND_EXAM_SRC } from "../commandExams";

interface Option {
  boundingBox?: BoundingBox;
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
      alignBoxHandler.renderModifiedPadding(renderCtx, style, ctx.getScale(), nextPadding);
    },
  };
}
