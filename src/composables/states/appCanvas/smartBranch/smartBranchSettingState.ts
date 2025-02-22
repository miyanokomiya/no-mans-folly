import { getLinePath } from "../../../../shapes/line";
import { COLORS } from "../../../../utils/color";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
import { renderVertexAnchorHighlight } from "../../../lineBounding";
import { newShapeComposite, ShapeComposite } from "../../../shapeComposite";
import { SmartBranchHandler } from "../../../smartBranchHandler";
import { newSmartBranchSettingHandler, SmartBranchSettingHandler } from "../../../smartBranchSettingHandler";
import { handleCommonWheel } from "../../commons";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { AppCanvasState, HighlightLineVertexMeta } from "../core";

type Option = {
  smartBranchHandler: SmartBranchHandler;
};

export function newSmartBranchSettingState(option: Option): AppCanvasState {
  let localShapeComposite: ShapeComposite;
  let highlightLineVertexMeta: HighlightLineVertexMeta | undefined;
  let canceled = false;
  let smartBranchSettingHandler: SmartBranchSettingHandler;
  let latestSmartBranchHandler: SmartBranchHandler;

  return {
    getLabel: () => "SmartBranchSetting",
    onStart: (ctx) => {
      const result = option.smartBranchHandler.retrieveHitResult();
      if (!result) return ctx.states.newSelectionHubState;

      // Ignore obstacles while tweaking smart-branch settings.
      latestSmartBranchHandler = option.smartBranchHandler.clone({ ignoreObstacles: true });
      const smartBranchHitResult = latestSmartBranchHandler.retrieveHitResult();
      if (!smartBranchHitResult) return ctx.states.newSelectionHubState;

      localShapeComposite = newShapeComposite({
        shapes: smartBranchHitResult.previewShapes,
        getStruct: ctx.getShapeComposite().getShapeStruct,
      });
      smartBranchSettingHandler = newSmartBranchSettingHandler({ smartBranchHitResult: smartBranchHitResult });
      ctx.showFloatMenu({
        targetRect: localShapeComposite.getWrapperRectForShapes(localShapeComposite.shapes, true),
        type: "smart-branch",
      });
      ctx.setCommandExams([COMMAND_EXAM_SRC.CANCEL]);
    },
    onResume: (ctx) => {
      ctx.showFloatMenu({
        targetRect: localShapeComposite.getWrapperRectForShapes(localShapeComposite.shapes, true),
        type: "smart-branch",
      });
      ctx.setCommandExams([COMMAND_EXAM_SRC.CANCEL]);
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setCommandExams();
      if (canceled) return;

      // Retrieve the handler regarding obstacles.
      const handler = latestSmartBranchHandler.clone({ ignoreObstacles: false });
      const smartBranchHitResult = handler.retrieveHitResult();
      if (!smartBranchHitResult) return;

      const branchShapes = handler.createBranch(smartBranchHitResult.index, ctx.generateUuid, ctx.createLastIndex());
      ctx.addShapes(branchShapes);
      ctx.selectShape(branchShapes[0].id);
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown": {
          const hitResult = smartBranchSettingHandler.hitTest(event.data.point, ctx.getScale());
          switch (hitResult?.type) {
            case "child-margin": {
              canceled = true;
              return () =>
                ctx.states.newSmartBranchChildMarginState({
                  smartBranchHandler: latestSmartBranchHandler,
                });
            }
          }

          ctx.hideFloatMenu();
          ctx.setCommandExams();
          return {
            type: "stack-resume",
            getState: () => ctx.states.newPointerDownEmptyState({ ...event.data.options, preventSelecting: true }),
          };
        }
        case "user-setting-change": {
          latestSmartBranchHandler = latestSmartBranchHandler.changeBranchTemplate(ctx.getUserSetting());
          return;
        }
        case "pointerhover": {
          const hitResult = smartBranchSettingHandler.hitTest(event.data.current, ctx.getScale());
          if (smartBranchSettingHandler.saveHitResult(hitResult)) {
            ctx.redraw();
          }
          return;
        }
        case "shape-highlight": {
          const meta = event.data.meta;
          switch (meta.type) {
            case "vertex": {
              highlightLineVertexMeta = meta.index !== -1 ? meta : undefined;
              ctx.redraw();
              return;
            }
          }
          return;
        }
        case "history": {
          canceled = true;
          return ctx.states.newSelectionHubState;
        }
        case "keydown": {
          switch (event.data.key) {
            case "Escape":
              canceled = true;
              return ctx.states.newSelectionHubState;
          }
          return;
        }
        case "wheel": {
          handleCommonWheel(ctx, event);
          return;
        }
      }
    },
    render: (ctx, renderCtx) => {
      const smartBranchHitResult = latestSmartBranchHandler.retrieveHitResult();
      if (!smartBranchHitResult) return;

      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();

      scaleGlobalAlpha(renderCtx, 0.7, () => {
        applyFillStyle(renderCtx, {
          color: COLORS.GRAY_1,
        });
        const rect = ctx.getViewRect();
        renderCtx.beginPath();
        renderCtx.rect(rect.x, rect.y, rect.width, rect.height);
        renderCtx.fill();
      });

      smartBranchHitResult.previewShapes.forEach((s) => {
        localShapeComposite.render(renderCtx, s);
      });
      smartBranchSettingHandler.render(renderCtx, style, scale);

      if (highlightLineVertexMeta) {
        const line = smartBranchHitResult.previewShapes[1];
        const p = getLinePath(line)[highlightLineVertexMeta.index];
        renderVertexAnchorHighlight(renderCtx, style, scale, p);
      }
    },
  };
}
