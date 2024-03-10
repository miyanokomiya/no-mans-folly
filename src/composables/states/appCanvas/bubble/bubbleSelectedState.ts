import {
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
} from "../commons";
import { newSelectionHubState } from "../selectionHubState";
import { CONTEXT_MENU_SHAPE_SELECTED_ITEMS } from "../contextMenuItems";
import { BoundingBox, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { newRotatingState } from "../rotatingState";
import {
  getLocalCornerControl,
  newBubbleHandler,
  renderBeakGuidlines,
  renderCornerGuidlines,
} from "../../../shapeHandlers/bubbleHandler";
import { RenderShapeControlFn, movingShapeControlState } from "../movingShapeControlState";
import {
  getLocalAbsolutePoint,
  getLocalRelativeRate,
  getShapeDetransform,
  getShapeTransform,
} from "../../../../shapes/simplePolygon";
import { IVec2, applyAffine, clamp, getDistance, getInner, getPedal, sub } from "okageo";
import { BubbleShape, getBeakControls, getMaxBeakSize } from "../../../../shapes/polygons/bubble";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
import { defineIntransientState } from "../intransientState";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";

export const newBubbleSelectedState = defineIntransientState(() => {
  let targetShape: BubbleShape;
  let shapeHandler: ReturnType<typeof newBubbleHandler>;
  let boundingBox: BoundingBox;

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
                        renderFn: renderBeakControls,
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
                        renderFn: renderBeakControls,
                        snapType: "self",
                      });
                  case "beakSizeC":
                    return () =>
                      movingShapeControlState<BubbleShape>({
                        targetId: targetShape.id,
                        patchFn: patchBeakSize,
                        getControlFn: (s) => applyAffine(getShapeTransform(s), getBeakControls(s).sizeControl),
                        renderFn: renderBeakControls,
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
                        renderFn: (stateCtx, renderCtx, latestShape) => {
                          renderCornerGuidlines(renderCtx, latestShape, stateCtx.getStyleScheme(), stateCtx.getScale());
                        },
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
                        renderFn: (stateCtx, renderCtx, latestShape) => {
                          renderCornerGuidlines(renderCtx, latestShape, stateCtx.getStyleScheme(), stateCtx.getScale());
                        },
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
              return () => newPointerDownEmptyState(event.data.options);
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
        case "pointerhover": {
          const nextHitResult = shapeHandler.hitTest(event.data.current, ctx.getScale());
          if (shapeHandler.saveHitResult(nextHitResult)) {
            ctx.redraw();
          }

          if (nextHitResult) {
            boundingBox.saveHitResult();
            return;
          }

          const hitBounding = boundingBox.hitTest(event.data.current, ctx.getScale());
          if (boundingBox.saveHitResult(hitBounding)) {
            ctx.redraw();
          }
          break;
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
      boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
      scaleGlobalAlpha(renderCtx, 0.5, () => {
        renderBeakGuidlines(renderCtx, targetShape, ctx.getStyleScheme(), ctx.getScale());
      });
      shapeHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
    },
  };
});

const renderBeakControls: RenderShapeControlFn<BubbleShape> = (stateCtx, renderCtx, latestShape) => {
  renderBeakGuidlines(renderCtx, latestShape, stateCtx.getStyleScheme(), stateCtx.getScale(), true);
};

function patchBeakSize(shape: BubbleShape, p: IVec2): Partial<BubbleShape> {
  const detransform = getShapeDetransform(shape);
  const { origin: beakOrigin, sizeControl: sizeC } = getBeakControls({ ...shape, beakSizeRate: 1 });
  const guideLine = [beakOrigin, sizeC];
  const localPedal = getPedal(applyAffine(detransform, p), guideLine);
  const isValid = getInner(sub(guideLine[1], guideLine[0]), sub(localPedal, guideLine[0])) >= 0;
  const maxSize = getMaxBeakSize(shape);
  const nextSize = isValid ? getDistance(localPedal, beakOrigin) : 0;
  const nextRate = clamp(0, 1, nextSize / maxSize);
  return { beakSizeRate: nextRate };
}
