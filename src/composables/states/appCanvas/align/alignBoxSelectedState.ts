import type { AppCanvasStateContext } from "../core";
import {
  getCommonCommandExams,
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
  startTextEditingIfPossible,
} from "../commons";
import { getMenuItemsForSelectedShapes } from "../contextMenuItems";
import { findBetterShapeAt } from "../../../shapeComposite";
import { BoundingBox, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { AlignBoxShape } from "../../../../shapes/align/alignBox";
import { newRotatingState } from "../rotatingState";
import { AlignBoxHandler, AlignBoxHitResult, newAlignBoxHandler } from "../../../alignHandler";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { newAlignBoxPaddingState } from "./alignBoxPaddingState";
import { newAlignBoxGapState } from "./alignBoxGapState";
import { defineIntransientState } from "../intransientState";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";

export const newAlignBoxSelectedState = defineIntransientState(() => {
  let targetId: string;
  let boundingBox: BoundingBox;
  let alignBoxHandler: AlignBoxHandler;
  let alignBoxHitResult: AlignBoxHitResult | undefined;

  function initHandler(ctx: AppCanvasStateContext) {
    const shapeComposite = ctx.getShapeComposite();
    const shapeMap = shapeComposite.shapeMap;
    const target = shapeMap[targetId];
    boundingBox = newBoundingBox({
      path: ctx.getShapeComposite().getLocalRectPolygon(target),
      locked: target.locked,
    });
    alignBoxHandler = newAlignBoxHandler({
      getShapeComposite: ctx.getShapeComposite,
      alignBoxId: targetId,
    });
  }

  return {
    getLabel: () => "AlignBoxSelected",
    onStart: (ctx) => {
      targetId = ctx.getLastSelectedShapeId()!;

      ctx.showFloatMenu();
      ctx.setCommandExams(getCommonCommandExams(ctx));
      initHandler(ctx);
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setCursor();
      ctx.setCommandExams();
      ctx.setContextMenuList();
    },
    handleEvent: (ctx, event) => {
      const shapeComposite = ctx.getShapeComposite();
      const targetShape: AlignBoxShape | undefined = shapeComposite.shapeMap[targetId] as AlignBoxShape;
      if (!targetShape) return ctx.states.newSelectionHubState;

      switch (event.type) {
        case "pointerdown":
          ctx.setContextMenuList();

          switch (event.data.options.button) {
            case 0: {
              alignBoxHitResult = alignBoxHandler.hitTest(event.data.point, ctx.getScale());
              if (alignBoxHitResult) {
                const shapeComposite = ctx.getShapeComposite();

                let patch: Partial<AlignBoxShape> | undefined;
                switch (alignBoxHitResult.type) {
                  case "direction": {
                    const maxSize = Math.max(targetShape.width, targetShape.height);
                    patch = {
                      direction: alignBoxHitResult.direction,
                      width: maxSize,
                      height: maxSize,
                    };
                    break;
                  }
                  case "align-items": {
                    if (alignBoxHitResult.value !== targetShape.alignItems) {
                      patch = { alignItems: alignBoxHitResult.value };
                    }
                    break;
                  }
                  case "optimize-width": {
                    patch = { baseWidth: undefined };
                    break;
                  }
                  case "optimize-height": {
                    patch = { baseHeight: undefined };
                    break;
                  }
                  case "padding-top":
                  case "padding-right":
                  case "padding-bottom":
                  case "padding-left": {
                    const type = alignBoxHitResult.type;
                    return () => newAlignBoxPaddingState({ type, alignBoxId: targetId });
                  }
                  case "gap-r":
                  case "gap-c": {
                    const type = alignBoxHitResult.type;
                    return () => newAlignBoxGapState({ type, alignBoxId: targetId });
                  }
                  case "resize-by-segment": {
                    const index = alignBoxHitResult.index;
                    return () =>
                      newResizingState({
                        boundingBox,
                        hitResult: { type: "segment", index },
                        resizeFn: (_, affine) => {
                          return { [targetShape.id]: shapeComposite.transformShape(targetShape, affine) };
                        },
                      });
                  }
                }

                if (patch) {
                  const layoutPatch = getPatchByLayouts(shapeComposite, {
                    update: { [targetShape.id]: patch },
                  });
                  ctx.patchShapes(layoutPatch);
                  alignBoxHitResult = undefined;
                }
                return;
              }

              const hitResult = boundingBox.hitTest(event.data.point, ctx.getScale());
              if (hitResult) {
                switch (hitResult.type) {
                  case "corner":
                  case "segment":
                    return () => newResizingState({ boundingBox, hitResult });
                  case "rotation":
                    return () => newRotatingState({ boundingBox });
                  case "move":
                    return () => ctx.states.newMovingHubState({ boundingBox });
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
        case "pointerdoubleclick": {
          const shapeComposite = ctx.getShapeComposite();
          const shapeAtPointer = findBetterShapeAt(
            shapeComposite,
            event.data.point,
            shapeComposite.getSelectionScope(targetShape),
          );
          if (shapeAtPointer && shapeAtPointer.id === targetShape.id) {
            return startTextEditingIfPossible(ctx, targetShape.id, event.data.point);
          }
          return;
        }
        case "pointerhover": {
          alignBoxHitResult = alignBoxHandler.hitTest(event.data.current, ctx.getScale());
          if (alignBoxHitResult) {
            boundingBox.saveHitResult();
          } else {
            const hitBounding = boundingBox.hitTest(event.data.current, ctx.getScale());
            boundingBox.saveHitResult(hitBounding);
          }

          ctx.redraw();
          break;
        }
        case "shape-updated": {
          if (event.data.keys.has(targetShape.id)) {
            initHandler(ctx);
          }
          return handleIntransientEvent(ctx, event);
        }
        case "contextmenu":
          ctx.setContextMenuList({
            items: getMenuItemsForSelectedShapes(ctx),
            point: event.data.point,
          });
          return;
        default:
          return handleIntransientEvent(ctx, event);
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();
      boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
      alignBoxHandler.render(renderCtx, style, scale, alignBoxHitResult);
    },
  };
});
