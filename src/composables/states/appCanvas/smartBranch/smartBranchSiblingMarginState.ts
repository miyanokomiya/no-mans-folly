import { rotate, sub } from "okageo";
import { renderOverlay } from "../../../../utils/renderer";
import { newShapeComposite, ShapeComposite } from "../../../shapeComposite";
import { SMART_BRANCH_CHILD_MARGIN, SmartBranchHandler } from "../../../smartBranchHandler";
import { renderSmartBranchSiblingMarginAnchor } from "../../../smartBranchSettingHandler";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { AppCanvasState } from "../core";

type Option = {
  smartBranchHandler: SmartBranchHandler;
};

export function newSmartBranchSiblingMarginState(option: Option): AppCanvasState {
  let previewShapeComposite: ShapeComposite;
  let nextSmartBranchHandler: SmartBranchHandler;
  let defaultSiblingMargin: number;
  let nextSiblingMargin: number;
  let showLabel = false;

  return {
    getLabel: () => "SmartBranchSiblingMargin",
    onStart: (ctx) => {
      const result = option.smartBranchHandler.retrieveHitResult();
      if (!result) return ctx.states.newSelectionHubState;

      nextSmartBranchHandler = option.smartBranchHandler;
      defaultSiblingMargin = ctx.getUserSetting().smartBranchSiblingMargin ?? SMART_BRANCH_CHILD_MARGIN;
      nextSiblingMargin = defaultSiblingMargin;
      previewShapeComposite = newShapeComposite({
        shapes: result.previewShapes,
        getStruct: ctx.getShapeComposite().getShapeStruct,
      });
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
          const v = -rotate(sub(event.data.current, event.data.start), (-Math.PI / 2) * result.index).x;
          nextSiblingMargin = Math.max(0, defaultSiblingMargin + v);

          if (!event.data.ctrl) {
            nextSiblingMargin = Math.round(nextSiblingMargin);
          }
          showLabel = !event.data.ctrl;

          const nextBranchTemplate = {
            ...ctx.getUserSetting(),
            smartBranchSiblingMargin: nextSiblingMargin,
          };
          nextSmartBranchHandler = nextSmartBranchHandler.changeBranchTemplate(nextBranchTemplate);
          ctx.redraw();
          return;
        }
        case "pointerup": {
          if (defaultSiblingMargin !== nextSiblingMargin) {
            ctx.patchUserSetting({ smartBranchSiblingMargin: nextSiblingMargin });
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

      renderOverlay(renderCtx, ctx.getViewRect());
      nextHitResult.previewShapes.forEach((s) => {
        previewShapeComposite.render(renderCtx, s);
      });

      renderSmartBranchSiblingMarginAnchor(
        renderCtx,
        style,
        scale,
        previewShapeComposite,
        nextHitResult.previewShapes[0],
        nextHitResult.index,
        nextSiblingMargin,
        true,
        showLabel,
      );
    },
  };
}
