import { COLORS } from "../../../../utils/color";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { renderValueLabel, scaleGlobalAlpha } from "../../../../utils/renderer";
import { newShapeComposite, ShapeComposite } from "../../../shapeComposite";
import { SMART_BRANCH_CHILD_MARGIN, SmartBranchHandler } from "../../../smartBranchHandler";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { AppCanvasState } from "../core";

type Option = {
  smartBranchHandler: SmartBranchHandler;
};

export function newSmartBranchChildMarginState(option: Option): AppCanvasState {
  let localShapeComposite: ShapeComposite;
  let nextSmartBranchHandler: SmartBranchHandler;
  let defaultChildMargin: number;
  let nextChildMargin: number;

  return {
    getLabel: () => "SmartBranchChildMargin",
    onStart: (ctx) => {
      const result = option.smartBranchHandler.retrieveHitResult();
      if (!result) return ctx.states.newSelectionHubState;

      nextSmartBranchHandler = option.smartBranchHandler;
      defaultChildMargin = ctx.getUserSetting().smartBranchChildMargin ?? SMART_BRANCH_CHILD_MARGIN;
      nextChildMargin = defaultChildMargin;
      localShapeComposite = newShapeComposite({
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
      switch (event.type) {
        case "pointermove": {
          let v = 0;
          switch (nextSmartBranchHandler.retrieveHitResult()?.index) {
            case 1:
              v = event.data.current.x - event.data.start.x;
              break;
            case 2:
              v = event.data.current.y - event.data.start.y;
              break;
            case 3:
              v = event.data.start.x - event.data.current.x;
              break;
            default:
              v = event.data.start.y - event.data.current.y;
              break;
          }

          nextChildMargin = Math.max(0, defaultChildMargin + v);

          if (!event.data.ctrl) {
            nextChildMargin = Math.round(nextChildMargin);
          }

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

      // const style = ctx.getStyleScheme();
      // const scale = ctx.getScale();

      scaleGlobalAlpha(renderCtx, 0.7, () => {
        applyFillStyle(renderCtx, {
          color: COLORS.GRAY_1,
        });
        const rect = ctx.getViewRect();
        renderCtx.beginPath();
        renderCtx.rect(rect.x, rect.y, rect.width, rect.height);
        renderCtx.fill();
      });
      nextHitResult.previewShapes.forEach((s) => {
        localShapeComposite.render(renderCtx, s);
      });

      const p = nextHitResult.previewShapes[1].q;
      renderValueLabel(renderCtx, nextChildMargin, p);
    },
  };
}
