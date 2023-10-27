import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import { canAttachSmartBranch } from "../../../shapes";
import {
  getCommonCommandExams,
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleCommonShortcut,
  handleCommonTextStyle,
  handleFileDrop,
  handleHistoryEvent,
  handleStateEvent,
  newShapeClipboard,
  startTextEditingIfPossible,
} from "./commons";
import { BoundingBox, HitResult, isSameHitResult, newBoundingBox } from "../../boundingBox";
import { newRotatingState } from "./rotatingState";
import { newResizingState } from "./resizingState";
import { SmartBranchHandler, SmartBranchHitResult, newSmartBranchHandler } from "../../smartBranchHandler";
import { getOuterRectangle } from "okageo";
import { newSelectionHubState } from "./selectionHubState";
import { CONTEXT_MENU_ITEM_SRC, handleContextItemEvent } from "./contextMenuItems";
import { isGroupShape } from "../../../shapes/group";
import { findBetterShapeAt } from "../../shapeComposite";
import { ShapeSelectionScope } from "../../../shapes/core";

export function newSingleSelectedState(): AppCanvasState {
  let selectedId: string | undefined;
  let boundingBox: BoundingBox;
  let smartBranchHandler: SmartBranchHandler | undefined;
  let smartBranchHitResult: SmartBranchHitResult | undefined;
  let selectionScope: ShapeSelectionScope | undefined;
  let isGroupShapeSelected: boolean;
  let hitResult: HitResult | undefined;

  return {
    getLabel: () => "SingleSelected",
    onStart: (ctx) => {
      const shapeComposite = ctx.getShapeComposite();
      selectedId = ctx.getLastSelectedShapeId();
      const shape = shapeComposite.shapeMap[selectedId ?? ""];
      if (!shape) return;

      ctx.showFloatMenu();
      selectionScope = shapeComposite.getSelectionScope(shape);
      isGroupShapeSelected = isGroupShape(shape);

      ctx.setCommandExams(getCommonCommandExams(ctx));

      boundingBox = newBoundingBox({
        path: shapeComposite.getLocalRectPolygon(shape),
        styleScheme: ctx.getStyleScheme(),
        scale: ctx.getScale(),
      });

      if (canAttachSmartBranch(ctx.getShapeStruct, shape)) {
        smartBranchHandler = newSmartBranchHandler({
          ...ctx,
          bounds: getOuterRectangle([boundingBox.path]),
        });
      }
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setContextMenuList();
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      if (!selectedId) return newSelectionHubState;

      switch (event.type) {
        case "pointerdown":
          ctx.setContextMenuList();

          switch (event.data.options.button) {
            case 0: {
              const hitResult = boundingBox.hitTest(event.data.point);
              if (hitResult) {
                switch (hitResult.type) {
                  case "corner":
                  case "segment":
                    return () => newResizingState({ boundingBox, hitResult });
                  case "rotation":
                    return () => newRotatingState({ boundingBox });
                }
              }

              const shapeComposite = ctx.getShapeComposite();
              const shape = shapeComposite.shapeMap[selectedId];

              if (smartBranchHandler) {
                smartBranchHitResult = smartBranchHandler.hitTest(event.data.point, shape, ctx.getScale());
                if (smartBranchHitResult) {
                  const branchShapes = smartBranchHandler.createBranch(smartBranchHitResult, shape, ctx.generateUuid);
                  ctx.addShapes(branchShapes);
                  ctx.selectShape(branchShapes[0].id);
                  return;
                }
              }

              return handleCommonPointerDownLeftOnSingleSelection(ctx, event, selectedId, selectionScope);
            }
            case 1:
              return { type: "stack-resume", getState: newPanningState };
            case 2: {
              return handleCommonPointerDownRightOnSingleSelection(ctx, event, selectedId, selectionScope);
            }
            default:
              return;
          }
        case "pointerdoubledown": {
          const hitResult = boundingBox.hitTest(event.data.point);
          if (hitResult) {
            if (isGroupShapeSelected) {
              const shapeComposite = ctx.getShapeComposite();
              const child = shapeComposite.findShapeAt(event.data.point, { parentId: selectedId });
              if (child) {
                ctx.selectShape(child.id);
              }
            } else {
              return startTextEditingIfPossible(ctx, selectedId, event.data.point);
            }
          }
          return;
        }
        case "pointerhover": {
          const _hitResult = boundingBox.hitTest(event.data.current);
          if (!isSameHitResult(hitResult, _hitResult)) {
            hitResult = _hitResult;
            ctx.redraw();
          }

          if (hitResult) {
            ctx.setCursor();
            return;
          } else {
            const shape = ctx.getShapeComposite().shapeMap[selectedId];
            const current = smartBranchHitResult?.index;

            if (smartBranchHandler) {
              smartBranchHitResult = smartBranchHandler.hitTest(event.data.current, shape, ctx.getScale());
              if (current !== smartBranchHitResult?.index) {
                ctx.setTmpShapeMap({});
                ctx.setCursor();
                return;
              }
            }
          }

          const shapeComposite = ctx.getShapeComposite();
          const shapeAtPointer = findBetterShapeAt(shapeComposite, event.data.current, selectionScope);
          ctx.setCursor(shapeAtPointer ? "pointer" : undefined);
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Delete":
              ctx.deleteShapes([selectedId]);
              return;
            case "Enter":
              event.data.prevent?.();
              return startTextEditingIfPossible(ctx, selectedId);
            default:
              return handleCommonShortcut(ctx, event);
          }
        case "shape-updated": {
          if (event.data.keys.has(selectedId)) {
            return newSelectionHubState;
          }
          return;
        }
        case "text-style": {
          return handleCommonTextStyle(ctx, event);
        }
        case "wheel":
          boundingBox.updateScale(ctx.zoomView(event.data.delta.y));
          return;
        case "selection": {
          return newSelectionHubState;
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return newSelectionHubState;
        case "state":
          return handleStateEvent(ctx, event, ["DroppingNewShape", "LineReady", "TextReady"]);
        case "contextmenu":
          ctx.setContextMenuList({
            items: [CONTEXT_MENU_ITEM_SRC.EXPORT_AS_PNG, CONTEXT_MENU_ITEM_SRC.COPY_AS_PNG],
            point: event.data.point,
          });
          return;
        case "contextmenu-item": {
          return handleContextItemEvent(ctx, event);
        }
        case "copy": {
          const clipboard = newShapeClipboard(ctx);
          clipboard.onCopy(event.nativeEvent);
          return;
        }
        case "paste": {
          const clipboard = newShapeClipboard(ctx);
          clipboard.onPaste(event.nativeEvent);
          return;
        }
        case "file-drop": {
          handleFileDrop(ctx, event);
          return;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const shape = ctx.getShapeComposite().shapeMap[selectedId ?? ""];
      if (!shape) return;

      boundingBox.render(renderCtx, undefined, hitResult);
      smartBranchHandler?.render(renderCtx, ctx.getStyleScheme(), ctx.getScale(), smartBranchHitResult);
    },
  };
}
