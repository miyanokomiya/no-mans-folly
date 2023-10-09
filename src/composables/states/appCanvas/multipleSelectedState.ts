import type { AppCanvasState } from "./core";
import { newPanningState } from "../commons";
import {
  getCommonCommandExams,
  handleCommonShortcut,
  handleCommonTextStyle,
  handleFileDrop,
  handleHistoryEvent,
  handleStateEvent,
  newShapeClipboard,
  startTextEditingIfPossible,
} from "./commons";
import * as geometry from "../../../utils/geometry";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { applyPath } from "../../../utils/renderer";
import { newMovingShapeState } from "./movingShapeState";
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { newResizingState } from "./resizingState";
import { newRotatingState } from "./rotatingState";
import { newRectangleSelectingState } from "./ractangleSelectingState";
import { newDuplicatingShapesState } from "./duplicatingShapesState";
import { newSelectionHubState } from "./selectionHubState";
import { CONTEXT_MENU_ITEM_SRC, handleContextItemEvent } from "./contextMenuItems";
import { COMMAND_EXAM_SRC } from "./commandExams";
import { findBetterShapeAt } from "../../shapeComposite";
import { isGroupShape } from "../../../shapes/group";

interface Option {
  // Once the bounding box is rotated, it's difficult to retrieve original bounding box.
  // Then, let this state receive concurrent bounding box.
  boundingBox?: BoundingBox;
}

export function newMultipleSelectedState(option?: Option): AppCanvasState {
  let selectedIdMap: { [id: string]: true };
  let boundingBox: BoundingBox;
  let scode: string | undefined;

  return {
    getLabel: () => "MultipleSelected",
    onStart: (ctx) => {
      selectedIdMap = ctx.getSelectedShapeIdMap();
      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;

      // Prevent selecting shapes that have different parents
      {
        const parentIdSet = new Set<string | undefined>();
        Object.keys(selectedIdMap).forEach((id) => {
          const shape = shapeMap[id];
          parentIdSet.add(shape.parentId);
        });

        if (parentIdSet.size >= 2) {
          const first: string = parentIdSet.keys().next()!.value;
          const nextSelected = Object.keys(selectedIdMap).filter((id) => {
            const shape = shapeMap[id];
            return shape.parentId === first;
          });
          ctx.multiSelectShapes(nextSelected);
          return newSelectionHubState;
        }

        scode = parentIdSet.keys().next()?.value;
      }

      ctx.showFloatMenu();
      if (Object.keys(selectedIdMap).some((id) => isGroupShape(shapeMap[id]))) {
        ctx.setCommandExams([COMMAND_EXAM_SRC.GROUP, COMMAND_EXAM_SRC.UNGROUP, ...getCommonCommandExams()]);
      } else {
        ctx.setCommandExams([COMMAND_EXAM_SRC.GROUP, ...getCommonCommandExams()]);
      }

      if (option?.boundingBox) {
        boundingBox = option.boundingBox;
      } else {
        const shapeRects = Object.keys(selectedIdMap)
          .map((id) => shapeMap[id])
          .map((s) => ctx.getShapeComposite().getWrapperRect(s));

        boundingBox = newBoundingBox({
          path: geometry.getRectPoints(geometry.getWrapperRect(shapeRects)),
          styleScheme: ctx.getStyleScheme(),
          scale: ctx.getScale(),
        });
      }
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setContextMenuList();
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      if (!selectedIdMap) return;

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
              const shape = findBetterShapeAt(shapeComposite, event.data.point, scode);
              if (!shape) {
                return () => newRectangleSelectingState({ keepSelection: event.data.options.ctrl });
              }

              if (!event.data.options.ctrl) {
                if (selectedIdMap[shape.id]) {
                  if (event.data.options.alt) {
                    return newDuplicatingShapesState;
                  } else {
                    return () => newMovingShapeState({ boundingBox });
                  }
                } else {
                  ctx.selectShape(shape.id, false);
                  if (event.data.options.alt) {
                    return newDuplicatingShapesState;
                  } else {
                    return newSingleSelectedByPointerOnState;
                  }
                }
              }

              ctx.selectShape(shape.id, true);
              return;
            }
            case 1:
              return { type: "stack-resume", getState: newPanningState };
            case 2: {
              const shapeComposite = ctx.getShapeComposite();
              const shapeAtPointer = findBetterShapeAt(shapeComposite, event.data.point, scode);
              if (!shapeAtPointer || selectedIdMap[shapeAtPointer.id]) return;

              ctx.selectShape(shapeAtPointer.id, event.data.options.ctrl);
              return;
            }
            default:
              return;
          }
        case "pointerdoubledown": {
          const shapeComposite = ctx.getShapeComposite();
          const shapeAtPointer = findBetterShapeAt(shapeComposite, event.data.point, scode);
          if (shapeAtPointer && selectedIdMap[shapeAtPointer.id]) {
            return startTextEditingIfPossible(ctx, shapeAtPointer.id, event.data.point);
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

          const shapeComposite = ctx.getShapeComposite();
          const shapeAtPointer = findBetterShapeAt(shapeComposite, event.data.current, scode);
          ctx.setCursor(shapeAtPointer ? "pointer" : undefined);
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Delete":
              ctx.deleteShapes(Object.keys(selectedIdMap));
              return;
            default:
              return handleCommonShortcut(ctx, event);
          }
        case "shape-updated": {
          if (Object.keys(selectedIdMap).some((id) => event.data.keys.has(id))) {
            return newSelectionHubState;
          }
          return;
        }
        case "text-style": {
          return handleCommonTextStyle(ctx, event);
        }
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          boundingBox.updateScale(ctx.getScale());
          return;
        case "selection": {
          return newSelectionHubState;
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return newMultipleSelectedState;
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
      const style = ctx.getStyleScheme();
      const shapeComposite = ctx.getShapeComposite();
      const shapes = Object.entries(shapeComposite.shapeMap)
        .filter(([id]) => selectedIdMap[id])
        .map(([, s]) => s);

      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 });
      renderCtx.beginPath();
      shapes.forEach((s) => applyPath(renderCtx, shapeComposite.getLocalRectPolygon(s), true));
      renderCtx.stroke();

      boundingBox.render(renderCtx);
    },
  };
}
