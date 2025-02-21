import { getLinePath } from "../../../../shapes/line";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { renderVertexAnchorHighlight } from "../../../lineBounding";
import { newShapeComposite, ShapeComposite } from "../../../shapeComposite";
import { SmartBranchHandler, SmartBranchHitResult } from "../../../smartBranchHandler";
import { AppCanvasState, HighlightLineVertexMeta } from "../core";
import { defineIntransientState } from "../intransientState";

type Option = {
  smartBranchHandler: SmartBranchHandler;
};

function newStateSrc(option: Option): AppCanvasState {
  let hitResult: SmartBranchHitResult;
  let localShapeComposite: ShapeComposite;
  let highlightLineVertexMeta: HighlightLineVertexMeta | undefined;
  let canceled = false;

  return {
    getLabel: () => "SmartBranchSetting",
    onStart: (ctx) => {
      const result = option.smartBranchHandler.retrieveHitResult();
      if (!result) return ctx.states.newSelectionHubState;

      hitResult = result;
      localShapeComposite = newShapeComposite({
        shapes: hitResult.previewShapes,
        getStruct: ctx.getShapeComposite().getShapeStruct,
      });
      ctx.showFloatMenu({
        targetRect: localShapeComposite.getWrapperRectForShapes(localShapeComposite.shapes, true),
        type: "smart-branch",
      });
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      if (canceled) return;

      const branchShapes = option.smartBranchHandler.createBranch(
        hitResult.index,
        ctx.generateUuid,
        ctx.createLastIndex(),
        ctx.getUserSetting(),
      );
      ctx.addShapes(branchShapes);
      ctx.selectShape(branchShapes[0].id);
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown": {
          return ctx.states.newSelectionHubState;
        }
        case "user-setting-change": {
          hitResult = {
            ...hitResult,
            previewShapes: option.smartBranchHandler.createBranch(
              hitResult.index,
              ctx.generateUuid,
              ctx.createLastIndex(),
              ctx.getUserSetting(),
            ),
          };
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
        }
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();

      scaleGlobalAlpha(renderCtx, 0.5, () => {
        hitResult.previewShapes.forEach((s) => {
          localShapeComposite.render(renderCtx, s);
        });
      });

      const rect = localShapeComposite.getWrapperRectForShapes(localShapeComposite.shapes);
      applyStrokeStyle(renderCtx, {
        color: style.selectionSecondaly,
        width: 3 * scale,
        dash: "short",
      });
      renderCtx.beginPath();
      renderCtx.rect(rect.x, rect.y, rect.width, rect.height);
      renderCtx.stroke();

      if (highlightLineVertexMeta) {
        const line = hitResult.previewShapes[1];
        const p = getLinePath(line)[highlightLineVertexMeta.index];
        renderVertexAnchorHighlight(renderCtx, style, scale, p);
      }
    },
  };
}

export const newSmartBranchSettingState = defineIntransientState<[Option]>(newStateSrc);
