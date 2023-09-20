import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import { canAttachSmartBranch, getLocalRectPolygon } from "../../../shapes";
import {
  handleCommonShortcut,
  handleCommonTextStyle,
  handleHistoryEvent,
  handleStateEvent,
  newShapeClipboard,
  startTextEditingIfPossible,
} from "./commons";
import { newMovingShapeState } from "./movingShapeState";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { newRotatingState } from "./rotatingState";
import { newResizingState } from "./resizingState";
import { newRectangleSelectingState } from "./ractangleSelectingState";
import { SmartBranchHandler, SmartBranchHitResult, newSmartBranchHandler } from "../../smartBranchHandler";
import { getOuterRectangle } from "okageo";
import { newDuplicatingShapesState } from "./duplicatingShapesState";
import { newSelectionHubState } from "./selectionHubState";

interface Option {
  boundingBox?: BoundingBox;
}

export function newSingleSelectedState(option?: Option): AppCanvasState {
  let selectedId: string | undefined;
  let boundingBox: BoundingBox;
  let smartBranchHandler: SmartBranchHandler | undefined;
  let smartBranchHitResult: SmartBranchHitResult | undefined;

  return {
    getLabel: () => "SingleSelected",
    onStart: (ctx) => {
      selectedId = ctx.getLastSelectedShapeId();
      const shape = ctx.getShapeMap()[selectedId ?? ""];
      if (!shape) return;

      ctx.showFloatMenu();

      boundingBox =
        option?.boundingBox ??
        newBoundingBox({
          path: getLocalRectPolygon(ctx.getShapeStruct, shape),
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
    },
    handleEvent: (ctx, event) => {
      if (!selectedId) return newSelectionHubState;

      switch (event.type) {
        case "pointerdown":
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

              const shape = ctx.getShapeMap()[selectedId];

              if (smartBranchHandler) {
                smartBranchHitResult = smartBranchHandler.hitTest(event.data.point, shape, ctx.getScale());
                if (smartBranchHitResult) {
                  const branchShapes = smartBranchHandler.createBranch(smartBranchHitResult, shape, ctx.generateUuid);
                  ctx.addShapes(branchShapes);
                  ctx.selectShape(branchShapes[0].id);
                  return;
                }
              }

              const shapeAtPointer = ctx.getShapeAt(event.data.point);
              if (!shapeAtPointer) {
                return () => newRectangleSelectingState({ keepSelection: event.data.options.ctrl });
              }

              if (!event.data.options.ctrl) {
                if (event.data.options.alt) {
                  ctx.selectShape(shapeAtPointer.id);
                  return newDuplicatingShapesState;
                } else if (shapeAtPointer.id === selectedId) {
                  return () => newMovingShapeState({ boundingBox });
                } else {
                  ctx.selectShape(shapeAtPointer.id);
                  return newSingleSelectedByPointerOnState;
                }
              }

              ctx.selectShape(shapeAtPointer.id, true);
              return;
            }
            case 1:
              return { type: "stack-restart", getState: newPanningState };
            default:
              return;
          }
        case "pointerdoubledown": {
          const hitResult = boundingBox.hitTest(event.data.point);
          if (hitResult) {
            return startTextEditingIfPossible(ctx, selectedId, event.data.point);
          }
          return;
        }
        case "pointerhover": {
          const hitBounding = boundingBox.hitTest(event.data.current);
          if (hitBounding) {
            const style = boundingBox.getCursorStyle(hitBounding);
            if (style) {
              ctx.setCursor(style);
              return;
            }
          } else {
            const shape = ctx.getShapeMap()[selectedId];
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

          const shape = ctx.getShapeAt(event.data.current);
          ctx.setCursor(shape ? "pointer" : undefined);
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
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const shape = ctx.getShapeMap()[selectedId ?? ""];
      if (!shape) return;

      boundingBox.render(renderCtx);
      smartBranchHandler?.render(renderCtx, ctx.getStyleScheme(), ctx.getScale(), smartBranchHitResult);
    },
  };
}
