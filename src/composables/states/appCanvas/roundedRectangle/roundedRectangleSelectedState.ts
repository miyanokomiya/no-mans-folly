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
  newRoundedRectangleHandler,
  renderCornerGuidlines,
} from "../../../shapeHandlers/roundedRectangleHandler";
import { defineIntransientState } from "../intransientState";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";
import { movingShapeControlState } from "../movingShapeControlState";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/simplePolygon";
import { applyAffine, clamp } from "okageo";
import { snapNumber } from "../../../../utils/geometry";
import { RoundedRectangleShape } from "../../../../shapes/polygons/roundedRectangle";
import { COMMAND_EXAM_SRC } from "../commandExams";

export const newRoundedRectangleSelectedState = defineIntransientState(() => {
  let targetShape: RoundedRectangleShape;
  let shapeHandler: ReturnType<typeof newRoundedRectangleHandler>;
  let boundingBox: BoundingBox;

  return {
    getLabel: () => "RectangleSelected",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      ctx.setCommandExams([]);
      targetShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as RoundedRectangleShape;
      shapeHandler = newRoundedRectangleHandler({ getShapeComposite: ctx.getShapeComposite, targetId: targetShape.id });

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
                  case "rx":
                    return () => {
                      let showLabel = !event.data.options.ctrl;
                      return movingShapeControlState<RoundedRectangleShape>({
                        targetId: targetShape.id,
                        snapType: "custom",
                        extraCommands: [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
                        patchFn: (s, p, movement) => {
                          const localP = applyAffine(getShapeDetransform(s), p);
                          let nextSize = clamp(0, s.width / 2, localP.x);
                          if (movement.ctrl) {
                            showLabel = false;
                          } else {
                            nextSize = snapNumber(nextSize, 1);
                            showLabel = true;
                          }
                          return movement.shift ? { rx: nextSize, ry: nextSize } : { rx: nextSize };
                        },
                        getControlFn: (s, scale) =>
                          applyAffine(getShapeTransform(s), getLocalCornerControl(s, scale)[0]),
                        renderFn: (ctx, renderCtx, s) => {
                          renderCornerGuidlines(renderCtx, ctx.getStyleScheme(), ctx.getScale(), s, showLabel);
                        },
                      });
                    };
                  case "ry":
                    return () => {
                      let showLabel = !event.data.options.ctrl;
                      return movingShapeControlState<RoundedRectangleShape>({
                        targetId: targetShape.id,
                        snapType: "custom",
                        extraCommands: [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
                        patchFn: (s, p, movement) => {
                          const localP = applyAffine(getShapeDetransform(s), p);
                          let nextSize = clamp(0, s.height / 2, localP.y);
                          if (movement.ctrl) {
                            showLabel = false;
                          } else {
                            nextSize = snapNumber(nextSize, 1);
                            showLabel = true;
                          }
                          return movement.shift ? { rx: nextSize, ry: nextSize } : { ry: nextSize };
                        },
                        getControlFn: (s, scale) =>
                          applyAffine(getShapeTransform(s), getLocalCornerControl(s, scale)[1]),
                        renderFn: (ctx, renderCtx, s) => {
                          renderCornerGuidlines(renderCtx, ctx.getStyleScheme(), ctx.getScale(), s, showLabel);
                        },
                      });
                    };
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
