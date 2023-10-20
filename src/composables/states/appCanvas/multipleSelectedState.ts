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
import { newSingleSelectedByPointerOnState } from "./singleSelectedByPointerOnState";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { newResizingState } from "./resizingState";
import { newRotatingState } from "./rotatingState";
import { newRectangleSelectingState } from "./ractangleSelectingState";
import { newDuplicatingShapesState } from "./duplicatingShapesState";
import { newSelectionHubState } from "./selectionHubState";
import { CONTEXT_MENU_ITEM_SRC, handleContextItemEvent } from "./contextMenuItems";
import { COMMAND_EXAM_SRC } from "./commandExams";
import { canGroupShapes, findBetterShapeAt, getRotatedTargetBounds } from "../../shapeComposite";
import { isGroupShape } from "../../../shapes/group";
import { newMovingHubState } from "./movingHubState";
import { ShapeSelectionScope, isSameShapeSelectionScope } from "../../../shapes/core";

interface Option {
  // Once the bounding box is rotated, it's difficult to retrieve original bounding box.
  // Then, let this state receive concurrent bounding box.
  boundingBox?: BoundingBox;
}

export function newMultipleSelectedState(option?: Option): AppCanvasState {
  let selectedIdMap: { [id: string]: true };
  let boundingBox: BoundingBox;
  let scode: ShapeSelectionScope | undefined;

  return {
    getLabel: () => "MultipleSelected",
    onStart: (ctx) => {
      selectedIdMap = ctx.getSelectedShapeIdMap();
      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const selectedIds = Object.keys(selectedIdMap);

      // Prevent selecting shapes that have different parents
      {
        let firstScope: ShapeSelectionScope | undefined;
        let multipleScope = false;
        selectedIds.forEach((id) => {
          const shape = shapeMap[id];
          const scope = shapeComposite.getSelectionScope(shape);
          if (!firstScope) {
            firstScope = scope;
          } else if (!isSameShapeSelectionScope(firstScope, scope)) {
            multipleScope = true;
          }
        });

        if (multipleScope) {
          const nextSelected = selectedIds.filter((id) => {
            const shape = shapeMap[id];
            return isSameShapeSelectionScope(firstScope, shapeComposite.getSelectionScope(shape));
          });
          ctx.multiSelectShapes(nextSelected);
          return newSelectionHubState;
        }

        scode = firstScope;
      }

      ctx.showFloatMenu();
      if (selectedIds.some((id) => isGroupShape(shapeMap[id]))) {
        ctx.setCommandExams([COMMAND_EXAM_SRC.GROUP, COMMAND_EXAM_SRC.UNGROUP, ...getCommonCommandExams()]);
      } else if (canGroupShapes(shapeComposite, selectedIds)) {
        ctx.setCommandExams([COMMAND_EXAM_SRC.GROUP, ...getCommonCommandExams()]);
      } else {
        ctx.setCommandExams(getCommonCommandExams());
      }

      if (option?.boundingBox) {
        // Recalculate the bounding because shapes aren't always transformed along with the bounding box.
        // => Also, need to conserve the rotation.
        boundingBox = newBoundingBox({
          path: getRotatedTargetBounds(shapeComposite, selectedIds, option.boundingBox.getRotation()),
          styleScheme: ctx.getStyleScheme(),
          scale: ctx.getScale(),
        });
      } else {
        const shapeRects = selectedIds.map((id) => shapeMap[id]).map((s) => shapeComposite.getWrapperRect(s));

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
                    return () => newMovingHubState({ boundingBox });
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

      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * ctx.getScale() });
      renderCtx.beginPath();
      shapes.forEach((s) => applyPath(renderCtx, shapeComposite.getLocalRectPolygon(s), true));
      renderCtx.stroke();

      boundingBox.render(renderCtx);
    },
  };
}
