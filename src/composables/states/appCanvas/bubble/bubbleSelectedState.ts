import type { AppCanvasState } from "../core";
import { newPanningState } from "../../commons";
import {
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
  startTextEditingIfPossible,
} from "../commons";
import { newSelectionHubState } from "../selectionHubState";
import { CONTEXT_MENU_SHAPE_SELECTED_ITEMS } from "../contextMenuItems";
import { BoundingBox, HitResult, isSameHitResult, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { newRotatingState } from "../rotatingState";
import { getLocalCornerControl, newBubbleHandler, renderBeakGuidlines } from "../../../shapeHandlers/bubbleHandler";
import { movingShapeControlState } from "../movingShapeControlState";
import {
  getLocalAbsolutePoint,
  getLocalRelativeRate,
  getShapeDetransform,
  getShapeTransform,
} from "../../../../shapes/simplePolygon";
import { applyAffine, clamp, getDistance, getInner, getPedal, sub } from "okageo";
import { BubbleShape, getBeakControls, getMaxBeakSize } from "../../../../shapes/polygons/bubble";
import { scaleGlobalAlpha } from "../../../../utils/renderer";

export function newBubbleSelectedState(): AppCanvasState {
  let targetShape: BubbleShape;
  let shapeHandler: ReturnType<typeof newBubbleHandler>;
  let boundingBox: BoundingBox;
  let boundingHitResult: HitResult | undefined;

  return {
    getLabel: () => "BubbleSelected",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      ctx.setCommandExams([]);
      targetShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as BubbleShape;
      shapeHandler = newBubbleHandler({ getShapeComposite: ctx.getShapeComposite, targetId: targetShape.id });

      const shapeComposite = ctx.getShapeComposite();
      boundingBox = newBoundingBox({
        path: shapeComposite.getLocalRectPolygon(targetShape),
        styleScheme: ctx.getStyleScheme(),
      });
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setCommandExams();
      ctx.setContextMenuList();
      ctx.setCursor();
    },
    handleEvent: (ctx, event) => {
      if (!targetShape) return newSelectionHubState;

      switch (event.type) {
        case "pointerdown":
          ctx.setContextMenuList();

          switch (event.data.options.button) {
            case 0: {
              const hitResult = shapeHandler.hitTest(event.data.point, ctx.getScale());
              shapeHandler.saveHitResult(hitResult);
              if (hitResult) {
                switch (hitResult.type) {
                  case "beakTipC":
                    return () =>
                      movingShapeControlState<BubbleShape>({
                        targetId: targetShape.id,
                        patchFn: (s, p) => {
                          return { beakTipC: getLocalRelativeRate(s, applyAffine(getShapeDetransform(s), p)) };
                        },
                        renderFn: (stateCtx, renderCtx, latestShape) => {
                          renderBeakGuidlines(renderCtx, latestShape, stateCtx.getStyleScheme(), stateCtx.getScale());
                        },
                        getControlFn: (s) => applyAffine(getShapeTransform(s), getLocalAbsolutePoint(s, s.beakTipC)),
                      });
                  case "beakOriginC":
                    return () =>
                      movingShapeControlState<BubbleShape>({
                        targetId: targetShape.id,
                        patchFn: (s, p) => {
                          const rate = getLocalRelativeRate(s, applyAffine(getShapeDetransform(s), p));
                          return { beakOriginC: { x: clamp(0, 1, rate.x), y: clamp(0, 1, rate.y) } };
                        },
                        getControlFn: (s) => applyAffine(getShapeTransform(s), getLocalAbsolutePoint(s, s.beakOriginC)),
                        renderFn: (stateCtx, renderCtx, latestShape) => {
                          renderBeakGuidlines(renderCtx, latestShape, stateCtx.getStyleScheme(), stateCtx.getScale());
                        },
                        snapType: "self",
                      });
                  case "beakSizeC":
                    return () =>
                      movingShapeControlState<BubbleShape>({
                        targetId: targetShape.id,
                        patchFn: (s, p) => {
                          const detransform = getShapeDetransform(s);
                          const {
                            origin: beakOrigin,
                            roots: [maxSizeRoot],
                          } = getBeakControls({ ...s, beakSizeRate: 1 });
                          const guideLine = [beakOrigin, maxSizeRoot];
                          const localPedal = getPedal(applyAffine(detransform, p), guideLine);
                          const isValid = getInner(sub(guideLine[1], guideLine[0]), sub(localPedal, guideLine[0])) >= 0;
                          const maxSize = getMaxBeakSize(s);
                          const nextSize = isValid ? getDistance(localPedal, beakOrigin) : 0;
                          const nextRate = clamp(0, 1, nextSize / maxSize);
                          return { beakSizeRate: nextRate };
                        },
                        getControlFn: (s) => applyAffine(getShapeTransform(s), getBeakControls(s).roots[0]),
                        renderFn: (stateCtx, renderCtx, latestShape) => {
                          renderBeakGuidlines(
                            renderCtx,
                            latestShape,
                            stateCtx.getStyleScheme(),
                            stateCtx.getScale(),
                            true,
                          );
                        },
                        snapType: "disabled",
                      });
                  case "cornerXC":
                    return () =>
                      movingShapeControlState<BubbleShape>({
                        targetId: targetShape.id,
                        patchFn: (s, p) => {
                          const rate = getLocalRelativeRate(s, applyAffine(getShapeDetransform(s), p));
                          return { cornerC: { x: clamp(0, 0.5, rate.x), y: s.cornerC.y } };
                        },
                        getControlFn: (s, scale) =>
                          applyAffine(getShapeTransform(s), getLocalCornerControl(s, scale)[0]),
                        snapType: "disabled",
                      });
                  case "cornerYC":
                    return () =>
                      movingShapeControlState<BubbleShape>({
                        targetId: targetShape.id,
                        patchFn: (s, p) => {
                          const rate = getLocalRelativeRate(s, applyAffine(getShapeDetransform(s), p));
                          return { cornerC: { x: s.cornerC.x, y: clamp(0, 0.5, rate.y) } };
                        },
                        getControlFn: (s, scale) =>
                          applyAffine(getShapeTransform(s), getLocalCornerControl(s, scale)[1]),
                        snapType: "disabled",
                      });
                  default:
                    return;
                }
              }

              const boundingHitResult = boundingBox.hitTest(event.data.point, ctx.getScale());
              if (boundingHitResult) {
                switch (boundingHitResult.type) {
                  case "corner":
                  case "segment":
                    return () => newResizingState({ boundingBox, hitResult: boundingHitResult });
                  case "rotation":
                    return () => newRotatingState({ boundingBox });
                }
              }

              return handleCommonPointerDownLeftOnSingleSelection(
                ctx,
                event,
                targetShape.id,
                ctx.getShapeComposite().getSelectionScope(targetShape),
              );
            }
            case 1:
              return { type: "stack-resume", getState: newPanningState };
            case 2: {
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
        case "pointerdoubledown": {
          const hitResult = boundingBox.hitTest(event.data.point, ctx.getScale());
          if (hitResult) {
            return startTextEditingIfPossible(ctx, targetShape.id, event.data.point);
          }
          return;
        }
        case "pointerhover": {
          const nextHitResult = shapeHandler.hitTest(event.data.current, ctx.getScale());
          if (shapeHandler.saveHitResult(nextHitResult)) {
            ctx.redraw();
          }

          if (nextHitResult) {
            boundingHitResult = undefined;
            return;
          }

          const hitBounding = boundingBox.hitTest(event.data.current, ctx.getScale());
          if (!isSameHitResult(boundingHitResult, hitBounding)) {
            boundingHitResult = hitBounding;
            ctx.redraw();
          }

          if (hitBounding) {
            return;
          }

          return handleIntransientEvent(ctx, event);
        }
        case "contextmenu":
          ctx.setContextMenuList({
            items: CONTEXT_MENU_SHAPE_SELECTED_ITEMS,
            point: event.data.point,
          });
          return;
        default:
          return handleIntransientEvent(ctx, event);
      }
    },
    render: (ctx, renderCtx) => {
      boundingBox.render(renderCtx, undefined, boundingHitResult, ctx.getScale());
      scaleGlobalAlpha(renderCtx, 0.5, () => {
        renderBeakGuidlines(renderCtx, targetShape, ctx.getStyleScheme(), ctx.getScale());
      });
      shapeHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
    },
  };
}
