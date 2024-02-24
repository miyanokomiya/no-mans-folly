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
import { getLocalBeakControls, newBubbleHandler } from "../../../shapeHandlers/bubbleHandler";
import { movingShapeControlState } from "../movingShapeControlState";
import {
  getLocalAbsolutePoint,
  getLocalRelativeRate,
  getShapeDetransform,
  getShapeTransform,
} from "../../../../shapes/simplePolygon";
import { applyAffine, clamp, getDistance, getPedal, isOnSeg, rotate } from "okageo";
import { BubbleShape, getBeakSize } from "../../../../shapes/polygons/bubble";

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
                        getControlFn: (s) => applyAffine(getShapeTransform(s), getLocalAbsolutePoint(s, s.beakTipC)),
                      });
                  case "beakSizeC":
                    return () =>
                      movingShapeControlState<BubbleShape>({
                        targetId: targetShape.id,
                        patchFn: (s, p) => {
                          const detransform = getShapeDetransform(s);
                          const localCenter = getLocalAbsolutePoint(s, { x: 0.5, y: 0.5 });
                          const { tip } = getLocalBeakControls(s);
                          const sizeSeg = [rotate(tip, -Math.PI / 2, localCenter), localCenter];
                          const localPedal = getPedal(applyAffine(detransform, p), sizeSeg);
                          const nextSize = isOnSeg(localPedal, sizeSeg) ? getDistance(localPedal, localCenter) : 0;
                          const baseSize = getBeakSize(s) / s.beakSizeRate;
                          const nextRate = clamp(0, 1, nextSize / baseSize);
                          return { beakSizeRate: nextRate };
                        },
                        getControlFn: (s) => applyAffine(getShapeTransform(s), getLocalBeakControls(s).size),
                        disableSnap: true,
                      });
                  case "cornerC":
                    return () =>
                      movingShapeControlState<BubbleShape>({
                        targetId: targetShape.id,
                        patchFn: (s, p) => {
                          const rate = getLocalRelativeRate(s, applyAffine(getShapeDetransform(s), p));
                          return {
                            cornerC: {
                              x: clamp(0, 0.5, rate.x),
                              y: clamp(0, 0.5, rate.y),
                            },
                          };
                        },
                        getControlFn: (s) => applyAffine(getShapeTransform(s), getLocalAbsolutePoint(s, s.cornerC)),
                        disableSnap: true,
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
      shapeHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
    },
  };
}
