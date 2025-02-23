import { getLinePath } from "../../../../shapes/line";
import { renderOverlay } from "../../../../utils/renderer";
import { renderVertexAnchorHighlight } from "../../../lineBounding";
import { newShapeComposite } from "../../../shapeComposite";
import { SmartBranchHandler } from "../../../smartBranchHandler";
import { newSmartBranchSettingHandler, SmartBranchSettingHandler } from "../../../smartBranchSettingHandler";
import { handleCommonWheel } from "../../commons";
import { AppCanvasState, HighlightLineVertexMeta } from "../core";

type Option = {
  smartBranchHandler: SmartBranchHandler;
};

export function newSmartBranchSettingState(option: Option): AppCanvasState {
  let highlightLineVertexMeta: HighlightLineVertexMeta | undefined;
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

      const previewShapeComposite = newShapeComposite({
        shapes: smartBranchHitResult.previewShapes,
        getStruct: ctx.getShapeComposite().getShapeStruct,
      });
      smartBranchSettingHandler = newSmartBranchSettingHandler({
        smartBranchHitResult: smartBranchHitResult,
        previewShapeComposite,
        smartBranchSiblingMargin: ctx.getUserSetting().smartBranchSiblingMargin,
      });
      ctx.showFloatMenu({
        targetRect: previewShapeComposite.getWrapperRectForShapes(previewShapeComposite.shapes, true),
        type: "smart-branch",
      });
    },
    onResume: (ctx) => {
      const smartBranchHitResult = latestSmartBranchHandler.retrieveHitResult();
      if (!smartBranchHitResult) return ctx.states.newSelectionHubState;

      const previewShapeComposite = newShapeComposite({
        shapes: smartBranchHitResult.previewShapes,
        getStruct: ctx.getShapeComposite().getShapeStruct,
      });
      ctx.showFloatMenu({
        targetRect: previewShapeComposite.getWrapperRectForShapes(previewShapeComposite.shapes, true),
        type: "smart-branch",
      });
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown": {
          const hitResult = smartBranchSettingHandler.hitTest(event.data.point, ctx.getScale());
          switch (hitResult?.type) {
            case "child-margin": {
              return () =>
                ctx.states.newSmartBranchChildMarginState({
                  smartBranchHandler: latestSmartBranchHandler,
                });
            }
            case "sibling-margin": {
              return () =>
                ctx.states.newSmartBranchSiblingMarginState({
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
          const smartBranchHitResult = latestSmartBranchHandler.retrieveHitResult();
          if (!smartBranchHitResult) return ctx.states.newSelectionHubState;

          const previewShapeComposite = newShapeComposite({
            shapes: smartBranchHitResult.previewShapes,
            getStruct: ctx.getShapeComposite().getShapeStruct,
          });
          smartBranchSettingHandler = newSmartBranchSettingHandler({
            smartBranchHitResult: smartBranchHitResult,
            previewShapeComposite,
            smartBranchSiblingMargin: ctx.getUserSetting().smartBranchSiblingMargin,
          });
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
          return ctx.states.newSelectionHubState;
        }
        case "keydown": {
          switch (event.data.key) {
            case "Escape":
              return ctx.states.newSelectionHubState;
            case "z":
            case "Z":
              if (event.data.ctrl) {
                // Break this state by history operations since they don't work with this state.
                return ctx.states.newSelectionHubState;
              }
              return;
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

      renderOverlay(renderCtx, ctx.getViewRect());
      smartBranchSettingHandler.render(renderCtx, style, scale);

      if (highlightLineVertexMeta) {
        const line = smartBranchHitResult.previewShapes[1];
        const p = getLinePath(line)[highlightLineVertexMeta.index];
        renderVertexAnchorHighlight(renderCtx, style, scale, p);
      }
    },
  };
}
