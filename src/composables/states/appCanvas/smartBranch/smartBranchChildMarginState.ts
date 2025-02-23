import { rotate, sub } from "okageo";
import { renderOverlay } from "../../../../utils/renderer";
import { newShapeComposite } from "../../../shapeComposite";
import {
  SMART_BRANCH_CHILD_MARGIN,
  SMART_BRANCH_SIBLING_MARGIN,
  SmartBranchHandler,
} from "../../../smartBranchHandler";
import { renderSmartBranchPreview, renderSmartBranchChildMarginAnchor } from "../../../smartBranchSettingHandler";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { AppCanvasState } from "../core";

type Option = {
  smartBranchHandler: SmartBranchHandler;
};

export function newSmartBranchChildMarginState(option: Option): AppCanvasState {
  let nextSmartBranchHandler: SmartBranchHandler;
  let defaultChildMargin: number;
  let nextChildMargin: number;
  let showLabel = false;

  return {
    getLabel: () => "SmartBranchChildMargin",
    onStart: (ctx) => {
      const result = option.smartBranchHandler.retrieveHitResult();
      if (!result) return ctx.states.newSelectionHubState;

      nextSmartBranchHandler = option.smartBranchHandler;
      defaultChildMargin = ctx.getUserSetting().smartBranchChildMargin ?? SMART_BRANCH_CHILD_MARGIN;
      nextChildMargin = defaultChildMargin;
      ctx.startDragging();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_SNAP]);
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      const result = option.smartBranchHandler.retrieveHitResult();
      if (!result) return ctx.states.newSelectionHubState;

      switch (event.type) {
        case "pointermove": {
          const v = -rotate(sub(event.data.current, event.data.start), (-Math.PI / 2) * result.index).y;
          nextChildMargin = Math.max(0, defaultChildMargin + v);

          if (!event.data.ctrl) {
            nextChildMargin = Math.round(nextChildMargin);
          }
          showLabel = !event.data.ctrl;

          const nextBranchTemplate = {
            ...ctx.getUserSetting(),
            smartBranchChildMargin: nextChildMargin,
          };
          nextSmartBranchHandler = nextSmartBranchHandler.changeBranchTemplate(nextBranchTemplate);
          ctx.redraw();
          return;
        }
        case "pointerup": {
          if (defaultChildMargin !== nextChildMargin) {
            ctx.patchUserSetting({ smartBranchChildMargin: nextChildMargin });
          }
          return () => ctx.states.newSmartBranchSettingState({ smartBranchHandler: nextSmartBranchHandler });
        }
      }
    },
    render: (ctx, renderCtx) => {
      const nextHitResult = nextSmartBranchHandler.retrieveHitResult();
      if (!nextHitResult) return;

      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();
      const previewShapeComposite = newShapeComposite({
        shapes: nextHitResult.previewShapes,
        getStruct: ctx.getShapeComposite().getShapeStruct,
      });

      renderOverlay(renderCtx, ctx.getViewRect());
      renderSmartBranchPreview(
        renderCtx,
        previewShapeComposite,
        nextHitResult,
        ctx.getUserSetting().smartBranchSiblingMargin ?? SMART_BRANCH_SIBLING_MARGIN,
      );
      renderSmartBranchChildMarginAnchor(
        renderCtx,
        style,
        scale,
        previewShapeComposite,
        nextHitResult.previewShapes[0],
        nextHitResult.index,
        nextChildMargin,
        true,
        showLabel,
      );
    },
  };
}
