import type { AppCanvasState, AppCanvasStateContext } from "../core";
import {
  getCommonCommandExams,
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
} from "../commons";
import { CONTEXT_MENU_ITEM_SRC, getMenuItemsForSelectedShapes, getPatchByDissolveShapes } from "../contextMenuItems";
import { BoundingBox, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { AlignBoxShape } from "../../../../shapes/align/alignBox";
import { AlignBoxHandler, AlignBoxHitResult, newAlignBoxHandler } from "../../../alignHandler";
import { defineIntransientState } from "../intransientState";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";
import { getPatchByAlignBoxHitResult, handleAlignBoxHitResult } from "../align/utils";

export const newFrameAlignGroupSelectedState = defineIntransientState(() => {
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
      noExport: target.noExport,
      noRotation: true,
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
    hasHitResult: () => !!boundingBox.retrieveHitResult() || !!alignBoxHitResult,
    getLabel: () => "AlignBoxSelected",
    onStart: (ctx) => {
      targetId = ctx.getLastSelectedShapeId()!;

      ctx.showFloatMenu();
      ctx.setCommandExams(getCommonCommandExams(ctx));
      initHandler(ctx);
    },
    onEnd: (ctx) => {
      ctx.setTmpShapeMap({});
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
          const nextAlignBoxHitResult = alignBoxHandler.hitTest(event.data.current, ctx.getScale());
          if (!alignBoxHandler.isSameHitResult(nextAlignBoxHitResult, alignBoxHitResult)) {
            alignBoxHitResult = nextAlignBoxHitResult;
            ctx.redraw();

            const patch = alignBoxHitResult
              ? getPatchByAlignBoxHitResult(ctx, targetShape, alignBoxHitResult)
              : undefined;
            ctx.setTmpShapeMap(patch ?? {});
          }

          if (alignBoxHitResult) {
            if (boundingBox.saveHitResult()) ctx.redraw();
          } else {
            const hitBounding = boundingBox.hitTest(event.data.current, ctx.getScale());
            if (boundingBox.saveHitResult(hitBounding)) ctx.redraw();
          }
          break;
        }
        case "contextmenu":
          ctx.setContextMenuList({
            items: [
              CONTEXT_MENU_ITEM_SRC.DISSOLVE_LAYOUT,
              CONTEXT_MENU_ITEM_SRC.SEPARATOR,
              ...getMenuItemsForSelectedShapes(ctx),
            ],
            point: event.data.point,
          });
          return;
        case "contextmenu-item": {
          switch (event.data.key) {
            case CONTEXT_MENU_ITEM_SRC.DISSOLVE_LAYOUT.key: {
              const sc = ctx.getShapeComposite();
              const target = sc.shapeMap[targetId];
              const patch = getPatchByDissolveShapes(ctx.getShapeComposite(), [target]);
              ctx.deleteShapes([target.id], patch);
              ctx.multiSelectShapes(Object.keys(patch));
              return ctx.states.newSelectionHubState;
            }
            default:
              return handleIntransientEvent(ctx, event);
          }
        }
        default:
          return handleIntransientEvent(ctx, event);
      }
    },
    render,
  };
});
