import {
  getCommonCommandExams,
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
  startTextEditingIfPossible,
} from "./commons";
import { getMenuItemsForSelectedShapes } from "./contextMenuItems";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { newResizingState } from "./resizingState";
import { newRotatingState } from "./rotatingState";
import { defineIntransientState } from "./intransientState";
import { newPointerDownEmptyState } from "./pointerDownEmptyState";
import { AppCanvasState, AppCanvasStateContext } from "./core";
import { Shape } from "../../../models";
import { newDummyHandler, ShapeHandler } from "../../shapeHandlers/core";
import { newSmartBranchHandler, SmartBranchHandler } from "../../smartBranchHandler";
import { canAttachSmartBranch, isNoRotationShape } from "../../../shapes";
import { getAttachmentAnchorPoint } from "../../lineAttachmentHandler";
import { applyFillStyle } from "../../../utils/fillStyle";
import { TAU } from "../../../utils/geometry";
import { scaleGlobalAlpha } from "../../../utils/renderer";
import { COMMAND_EXAM_SRC } from "./commandExams";
import {
  getPatchByDetachFromShape,
  newShapeAttachmentHandler,
  ShapeAttachmentHandler,
} from "../../shapeAttachmentHandler";

interface SingleSelectedHandlerStateGetters<S extends Shape, H extends ShapeHandler> {
  getTargetShape: () => S;
  getShapeHandler: () => H;
  getBoundingBox: () => BoundingBox;
}

type DefOption = {
  hideSmartBranch?: boolean;
};

/**
 * "handleEvent" can be overridden by returning "null" from the custom handler.
 */
export function defineSingleSelectedHandlerState<S extends Shape, H extends ShapeHandler, A extends any[]>(
  createFn: (getters: SingleSelectedHandlerStateGetters<S, H>, ...o: A) => AppCanvasState,
  newHandlerFn?: (ctx: AppCanvasStateContext, targetShape: S) => H,
  option?: DefOption,
): (...o: A) => AppCanvasState {
  const hideSmartBranch = option?.hideSmartBranch ?? false;

  return defineIntransientState((...o: A) => {
    let targetShape: S;
    let shapeHandler: H;
    let boundingBox: BoundingBox;
    let smartBranchHandler: SmartBranchHandler | undefined;
    let shapeAttachmentHandler: ShapeAttachmentHandler;

    const src = createFn(
      {
        getTargetShape: () => targetShape,
        getShapeHandler: () => shapeHandler,
        getBoundingBox: () => boundingBox,
      },
      ...o,
    );

    // Should render in reversed order of handing priority
    const render: AppCanvasState["render"] = (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();
      const shapeComposite = ctx.getShapeComposite();

      if (shapeComposite.attached(targetShape, "line")) {
        const anchorP = getAttachmentAnchorPoint(shapeComposite, targetShape);
        scaleGlobalAlpha(renderCtx, 0.7, () => {
          applyFillStyle(renderCtx, { color: style.selectionSecondaly });
          renderCtx.beginPath();
          renderCtx.arc(anchorP.x, anchorP.y, 6 * scale, 0, TAU);
          renderCtx.fill();
        });
      }
      smartBranchHandler?.render(renderCtx, style, scale);
      boundingBox.render(renderCtx, style, scale);
      shapeAttachmentHandler.render(renderCtx, style, scale);
      shapeHandler.render(renderCtx, style, scale);
      src.render?.(ctx, renderCtx);
    };

    return {
      ...src,
      onStart: (ctx) => {
        targetShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as S;
        if (!targetShape) return ctx.states.newSelectionHubState;

        ctx.showFloatMenu();
        ctx.setCommandExams(getCommonCommandExams(ctx));
        shapeHandler = newHandlerFn?.(ctx, targetShape) ?? (newDummyHandler({}) as H);

        const shapeComposite = ctx.getShapeComposite();
        boundingBox = newBoundingBox({
          path: shapeComposite.getLocalRectPolygon(targetShape),
          locked: targetShape.locked,
          noExport: targetShape.noExport,
          noRotation: isNoRotationShape(shapeComposite.getShapeStruct, targetShape),
        });

        if (
          !hideSmartBranch &&
          !shapeComposite.hasParent(targetShape) &&
          !shapeComposite.attached(targetShape) &&
          canAttachSmartBranch(ctx.getShapeStruct, targetShape)
        ) {
          smartBranchHandler = newSmartBranchHandler({
            getShapeComposite: ctx.getShapeComposite,
            targetId: targetShape.id,
            branchTemplate: ctx.getUserSetting(),
          });
        }

        shapeAttachmentHandler = newShapeAttachmentHandler({
          getShapeComposite: ctx.getShapeComposite,
          targetIds: [targetShape.id],
        });

        src.onStart?.(ctx);
      },
      onEnd: (ctx) => {
        ctx.hideFloatMenu();
        ctx.setCommandExams();
        ctx.setContextMenuList();
        ctx.setCursor();

        src.onEnd?.(ctx);
      },
      handleEvent: (ctx, event) => {
        if (!targetShape) return ctx.states.newSelectionHubState;

        const res = src.handleEvent(ctx, event);
        if (res !== undefined) return res;

        switch (event.type) {
          case "pointerdown": {
            ctx.setContextMenuList();

            switch (event.data.options.button) {
              case 0: {
                const attachmentResult = shapeAttachmentHandler.hitTest(event.data.point, ctx.getScale());
                if (attachmentResult) {
                  ctx.patchShapes(getPatchByDetachFromShape(ctx.getShapeComposite(), [attachmentResult.id]));
                  return ctx.states.newSelectionHubState;
                }

                const boundingHitResult = boundingBox.hitTest(event.data.point, ctx.getScale());
                if (boundingHitResult) {
                  switch (boundingHitResult.type) {
                    case "corner":
                    case "segment":
                      return () => newResizingState({ boundingBox, hitResult: boundingHitResult });
                    case "rotation":
                      return () => newRotatingState({ boundingBox });
                    case "move":
                      return () => ctx.states.newMovingHubState({ ...event.data.options, boundingBox });
                  }
                }

                if (smartBranchHandler) {
                  const smartBranchHitResult = smartBranchHandler.hitTest(event.data.point, ctx.getScale());
                  if (smartBranchHitResult) {
                    return () =>
                      ctx.states.newSmartBranchPointerDownState({
                        smartBranchHandler: smartBranchHandler!,
                      });
                  }
                }

                return handleCommonPointerDownLeftOnSingleSelection(
                  ctx,
                  event,
                  targetShape.id,
                  ctx.getShapeComposite().getSelectionScope(targetShape),
                  undefined,
                  render,
                );
              }
              case 1:
                return () => newPointerDownEmptyState({ ...event.data.options, renderWhilePanning: render });
              case 2: {
                if (smartBranchHandler?.hitTest(event.data.point, ctx.getScale())) return;

                return handleCommonPointerDownRightOnSingleSelection(
                  ctx,
                  event,
                  targetShape.id,
                  ctx.getShapeComposite().getSelectionScope(targetShape),
                );
              }
              default:
                return;
            }
          }
          case "pointerhover": {
            const nextHitResult = shapeHandler.hitTest(event.data.current, ctx.getScale());
            if (shapeHandler.saveHitResult(nextHitResult)) {
              ctx.redraw();
            }
            if (nextHitResult) {
              shapeAttachmentHandler.saveHitResult();
              boundingBox.saveHitResult();
              smartBranchHandler?.saveHitResult();
              return;
            }

            const attachmentResult = shapeAttachmentHandler.hitTest(event.data.current, ctx.getScale());
            if (shapeAttachmentHandler.saveHitResult(attachmentResult)) {
              ctx.redraw();
            }
            if (attachmentResult) {
              boundingBox.saveHitResult();
              smartBranchHandler?.saveHitResult();
              return;
            }

            const hitBounding = boundingBox.hitTest(event.data.current, ctx.getScale());
            if (boundingBox.saveHitResult(hitBounding)) {
              ctx.redraw();
            }
            if (hitBounding) {
              smartBranchHandler?.saveHitResult();
              return;
            }

            if (smartBranchHandler) {
              const smartBranchHitResult = smartBranchHandler.hitTest(event.data.current, ctx.getScale());
              if (smartBranchHandler.saveHitResult(smartBranchHitResult)) {
                ctx.setCommandExams(
                  smartBranchHitResult ? [COMMAND_EXAM_SRC.SMART_BRANCH_SETTING] : getCommonCommandExams(ctx),
                );
                ctx.redraw();
              }

              if (smartBranchHitResult) {
                shapeAttachmentHandler.saveHitResult();
                return;
              }
            }

            break;
          }
          case "keydown": {
            switch (event.data.key) {
              case "Enter":
                event.data.prevent?.();
                return startTextEditingIfPossible(ctx, targetShape.id);
              default:
                return handleIntransientEvent(ctx, event);
            }
          }
          case "contextmenu": {
            if (smartBranchHandler) {
              const smartBranchHitResult = smartBranchHandler.hitTest(event.data.point, ctx.getScale());
              smartBranchHandler.saveHitResult(smartBranchHitResult);
              if (smartBranchHitResult) {
                return () => ctx.states.newSmartBranchSettingState({ smartBranchHandler: smartBranchHandler! });
              }
            }

            ctx.setContextMenuList({
              items: getMenuItemsForSelectedShapes(ctx),
              point: event.data.point,
            });
            return;
          }
          default:
            return handleIntransientEvent(ctx, event);
        }

        return src.handleEvent(ctx, event);
      },
      render,
    };
  });
}
