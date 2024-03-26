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
import { CylinderShape, getCylinderRadiusY } from "../../../../shapes/polygons/cylinder";
import { newCylinderHandler } from "../../../shapeHandlers/cylinderHandler";
import { newTransformingCylinderState } from "./transformingCylinderState";
import { movingShapeControlState } from "../movingShapeControlState";
import { getShapeTransform } from "../../../../shapes/simplePolygon";
import { applyAffine, getDistance, getRadian, multiAffines } from "okageo";
import { getGlobalAffine, getRotationAffine } from "../../../../utils/geometry";
import { defineIntransientState } from "../intransientState";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";

export const newCylinderSelectedState = defineIntransientState(() => {
  let targetShape: CylinderShape;
  let shapeHandler: ReturnType<typeof newCylinderHandler>;
  let boundingBox: BoundingBox;

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
              const shapeComposite = ctx.getShapeComposite();
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
                          const resized = shapeComposite.transformShape(
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
                          const resized = shapeComposite.transformShape(
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
      shapeHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
    },
  };
});
