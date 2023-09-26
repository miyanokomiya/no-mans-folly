import type { AppCanvasState } from "../core";
import { newPanningState } from "../../commons";
import {
  handleCommonShortcut,
  handleCommonTextStyle,
  handleHistoryEvent,
  handleStateEvent,
  newShapeClipboard,
  startTextEditingIfPossible,
} from "../commons";
import { newSingleSelectedByPointerOnState } from "../singleSelectedByPointerOnState";
import { newRectangleSelectingState } from "../ractangleSelectingState";
import { newDuplicatingShapesState } from "../duplicatingShapesState";
import { TextShape } from "../../../../shapes/text";
import { newSelectionHubState } from "../selectionHubState";
import { BoundingBox, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { getLocalRectPolygon } from "../../../../shapes";
import { newMovingLineLabelState } from "./movingLineLabelState";
import { LineShape } from "../../../../shapes/line";
import { renderParentLineRelation } from "../../../lineLabelHandler";
import { newRotatingLineLabelState } from "./rotatingLineLabelState";
import { CONTEXT_MENU_ITEM_SRC, handleContextItemEvent } from "../contextMenuItems";

interface Option {
  boundingBox?: BoundingBox;
}

export function newLineLabelSelectedState(option?: Option): AppCanvasState {
  let shape: TextShape;
  let parentLineShape: LineShape;
  let boundingBox: BoundingBox;

  return {
    getLabel: () => "LineLabelSelected",
    onStart: (ctx) => {
      const shapeMap = ctx.getShapeMap();
      const selectedId = ctx.getLastSelectedShapeId();
      shape = shapeMap[selectedId ?? ""] as TextShape;
      if (!shape) return newSelectionHubState;

      parentLineShape = shapeMap[shape.parentId ?? ""] as LineShape;
      if (!parentLineShape) return newSelectionHubState;

      ctx.showFloatMenu();

      boundingBox =
        option?.boundingBox ??
        newBoundingBox({
          path: getLocalRectPolygon(ctx.getShapeStruct, shape),
          styleScheme: ctx.getStyleScheme(),
          scale: ctx.getScale(),
        });
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setCursor();
      ctx.setContextMenuList();
    },
    handleEvent: (ctx, event) => {
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
                    return () => newRotatingLineLabelState({ boundingBox });
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
                } else if (shapeAtPointer.id === shape.id) {
                  return () => newMovingLineLabelState({ boundingBox });
                } else {
                  ctx.selectShape(shapeAtPointer.id);
                  return newSingleSelectedByPointerOnState;
                }
              }

              ctx.selectShape(shapeAtPointer.id, true);
              return;
            }
            case 1:
              return { type: "stack-resume", getState: newPanningState };
            case 2: {
              const shapeAtPointer = ctx.getShapeAt(event.data.point);
              if (!shapeAtPointer || shapeAtPointer.id === shape.id) return;

              ctx.selectShape(shapeAtPointer.id, event.data.options.ctrl);
              return;
            }
            default:
              return;
          }
        case "pointerdoubledown": {
          const hitResult = boundingBox.hitTest(event.data.point);
          if (hitResult) {
            return startTextEditingIfPossible(ctx, shape.id, event.data.point);
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
          }

          const shape = ctx.getShapeAt(event.data.current);
          ctx.setCursor(shape ? "pointer" : undefined);
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Delete":
              ctx.deleteShapes([shape.id]);
              return;
            case "Enter":
              event.data.prevent?.();
              return startTextEditingIfPossible(ctx, shape.id);
            default:
              return handleCommonShortcut(ctx, event);
          }
        case "shape-updated": {
          if (event.data.keys.has(shape.id)) {
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
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      renderParentLineRelation(ctx, renderCtx, shape, parentLineShape);
      boundingBox.render(renderCtx);
    },
  };
}