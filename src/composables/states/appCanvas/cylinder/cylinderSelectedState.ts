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
import { CylinderShape, getCylinderRadiusY } from "../../../../shapes/polygons/cylinder";
import { newCylinderHandler } from "../../../shapeHandlers/cylinderHandler";
import { newTransformingCylinderState } from "./transformingCylinderState";
import { movingShapeControlState } from "../movingShapeControlState";
import { getShapeTransform } from "../../../../shapes/simplePolygon";
import { applyAffine, getDistance, getRadian, multiAffines } from "okageo";
import { resizeShape } from "../../../../shapes";
import { getGlobalAffine, getRotationAffine } from "../../../../utils/geometry";

export function newCylinderSelectedState(): AppCanvasState {
  let targetShape: CylinderShape;
  let shapeHandler: ReturnType<typeof newCylinderHandler>;
  let boundingBox: BoundingBox;
  let boundingHitResult: HitResult | undefined;

  return {
    getLabel: () => "CylinderSelected",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      ctx.setCommandExams([]);
      targetShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as CylinderShape;
      shapeHandler = newCylinderHandler({ getShapeComposite: ctx.getShapeComposite, targetId: targetShape.id });

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
                  case "c0":
                    return () => newTransformingCylinderState({ targetId: targetShape.id });
                  case "top":
                    return () =>
                      movingShapeControlState<CylinderShape>({
                        targetId: targetShape.id,
                        patchFn: (s, p) => {
                          const ry = getCylinderRadiusY(s);
                          const origin = applyAffine(getShapeTransform(s), {
                            x: s.width / 2,
                            y: s.height,
                          });
                          const distance = getDistance(p, origin);
                          const top = Math.min(s.height - distance, s.height - 2 * ry);
                          const radDiff = getRadian(p, origin) + Math.PI / 2 - s.rotation;
                          const resized = resizeShape(
                            ctx.getShapeComposite().getShapeStruct,
                            s,
                            getGlobalAffine(
                              origin,
                              s.rotation,
                              multiAffines([getRotationAffine(radDiff), [1, 0, 0, (s.height - top) / s.height, 0, 0]]),
                            ),
                          );
                          return {
                            ...resized,
                            c0: { x: s.c0.x, y: (2 * ry) / (resized.height ?? s.height) },
                          };
                        },
                        getControlFn: (s) => applyAffine(getShapeTransform(s), { x: s.width / 2, y: 0 }),
                      });
                  case "bottom":
                    return () =>
                      movingShapeControlState<CylinderShape>({
                        targetId: targetShape.id,
                        patchFn: (s, p) => {
                          const ry = getCylinderRadiusY(s);
                          const origin = applyAffine(getShapeTransform(s), {
                            x: s.width / 2,
                            y: 0,
                          });
                          const distance = getDistance(p, origin);
                          const bottom = Math.max(distance, 2 * ry);
                          const radDiff = getRadian(p, origin) - Math.PI / 2 - s.rotation;
                          const resized = resizeShape(
                            ctx.getShapeComposite().getShapeStruct,
                            s,
                            getGlobalAffine(
                              applyAffine(getShapeTransform(s), {
                                x: s.width / 2,
                                y: 0,
                              }),
                              s.rotation,
                              multiAffines([getRotationAffine(radDiff), [1, 0, 0, bottom / s.height, 0, 0]]),
                            ),
                          );
                          return {
                            ...resized,
                            c0: { x: s.c0.x, y: (2 * ry) / (resized.height ?? s.height) },
                          };
                        },
                        getControlFn: (s) => applyAffine(getShapeTransform(s), { x: s.width / 2, y: s.height }),
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
