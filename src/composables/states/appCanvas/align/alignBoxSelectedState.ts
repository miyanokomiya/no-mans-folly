import type { AppCanvasState, AppCanvasStateContext } from "../core";
import {
  getCommonCommandExams,
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
} from "../commons";
import { getMenuItemsForSelectedShapes } from "../contextMenuItems";
import { BoundingBox, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { AlignBoxShape } from "../../../../shapes/align/alignBox";
import { newRotatingState } from "../rotatingState";
import { AlignBoxHandler, AlignBoxHitResult, newAlignBoxHandler } from "../../../alignHandler";
import { defineIntransientState } from "../intransientState";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";
import { handleAlignBoxHitResult } from "./utils";

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

  const render: AppCanvasState["render"] = (ctx, renderCtx) => {
    const style = ctx.getStyleScheme();
    const scale = ctx.getScale();
    boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
    alignBoxHandler.render(renderCtx, style, scale, alignBoxHitResult);
  };

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
              const alignBoxHitResult = alignBoxHandler.hitTest(event.data.point, ctx.getScale());
              if (alignBoxHitResult) {
                const handleResult = handleAlignBoxHitResult(ctx, targetShape, alignBoxHitResult);
                return handleResult;
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
                undefined,
                render,
              );
            }
            case 1:
              return () => newPointerDownEmptyState({ ...event.data.options, renderWhilePanning: render });
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
    render,
  };
});
