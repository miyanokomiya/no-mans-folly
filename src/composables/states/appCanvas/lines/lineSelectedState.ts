import type { AppCanvasState } from "../core";
import { newPanningState } from "../../commons";
import {
  getCommonCommandExams,
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleCommonShortcut,
  handleCommonWheel,
  handleFileDrop,
  handleHistoryEvent,
  handleStateEvent,
  newShapeClipboard,
} from "../commons";
import { LineShape, deleteVertex, getLinePath, getRelativePointOn } from "../../../../shapes/line";
import { LineBounding, newLineBounding } from "../../../lineBounding";
import { newMovingLineVertexState } from "./movingLineVertexState";
import { newMovingNewVertexState } from "./movingNewVertexState";
import { newDuplicatingShapesState } from "../duplicatingShapesState";
import { createShape } from "../../../../shapes";
import { TextShape, patchPosition } from "../../../../shapes/text";
import { newTextEditingState } from "../text/textEditingState";
import { newSelectionHubState } from "../selectionHubState";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { CONTEXT_MENU_ITEM_SRC, handleContextItemEvent } from "../contextMenuItems";
import { findBetterShapeAt } from "../../../shapeComposite";
import { newMovingHubState } from "../movingHubState";
import { getAutomaticCurve } from "../../../../utils/curveLine";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { newMovingLineSegmentState } from "./movingLineSegmentState";
import { newMovingLineArcState } from "./movingLineArcState";

export function newLineSelectedState(): AppCanvasState {
  let lineShape: LineShape;
  let lineBounding: LineBounding;

  return {
    getLabel: () => "LineSelected",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      lineShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as LineShape;
      lineBounding = newLineBounding({ lineShape, styleScheme: ctx.getStyleScheme() });
      ctx.setCommandExams([COMMAND_EXAM_SRC.DELETE_INER_VERTX, ...getCommonCommandExams(ctx)]);
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setCursor();
      ctx.setCommandExams();
      ctx.setContextMenuList();
    },
    handleEvent: (ctx, event) => {
      if (!lineShape) return newSelectionHubState;

      switch (event.type) {
        case "pointerdown":
          ctx.setContextMenuList();

          switch (event.data.options.button) {
            case 0: {
              const hitResult = lineBounding.hitTest(event.data.point, ctx.getScale());
              if (hitResult) {
                if (event.data.options.alt) {
                  return newDuplicatingShapesState;
                }

                switch (hitResult.type) {
                  case "move-anchor":
                    return newMovingHubState;
                  case "vertex":
                    if (event.data.options.shift) {
                      const patch = deleteVertex(lineShape, hitResult.index);
                      if (Object.keys(patch).length > 0) {
                        if (lineShape.curveType === "auto") {
                          patch.curves = getAutomaticCurve(getLinePath({ ...lineShape, ...patch }));
                        }
                        ctx.patchShapes(
                          getPatchAfterLayouts(ctx.getShapeComposite(), { update: { [lineShape.id]: patch } }),
                        );
                      }
                      return newSelectionHubState;
                    } else {
                      return () => newMovingLineVertexState({ lineShape, index: hitResult.index });
                    }
                  case "edge":
                    return () => newMovingLineSegmentState({ lineShape, index: hitResult.index });
                  case "new-vertex-anchor":
                    return () =>
                      newMovingNewVertexState({ lineShape, index: hitResult.index + 1, p: event.data.point });
                  case "arc-anchor":
                    return () => newMovingLineArcState({ lineShape, index: hitResult.index, p: event.data.point });
                }
              }

              return handleCommonPointerDownLeftOnSingleSelection(
                ctx,
                event,
                lineShape.id,
                ctx.getShapeComposite().getSelectionScope(lineShape),
                [lineShape.id],
              );
            }
            case 1:
              return { type: "stack-resume", getState: newPanningState };
            case 2: {
              return handleCommonPointerDownRightOnSingleSelection(
                ctx,
                event,
                lineShape.id,
                ctx.getShapeComposite().getSelectionScope(lineShape),
                [lineShape.id],
              );
            }
            default:
              return;
          }
        case "pointerhover": {
          const hitResult = lineBounding.hitTest(event.data.current, ctx.getScale());
          if (lineBounding.saveHitResult(hitResult)) ctx.setTmpShapeMap({});
          if (hitResult) {
            ctx.setCursor();
            return;
          }

          const shapeComposite = ctx.getShapeComposite();
          const shapeAtPointer = findBetterShapeAt(shapeComposite, event.data.current, { parentId: lineShape.id }, [
            lineShape.id,
          ]);
          ctx.setCursor(shapeAtPointer ? "pointer" : undefined);
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Delete":
              ctx.deleteShapes([lineShape.id]);
              return;
            default:
              return handleCommonShortcut(ctx, event);
          }
        case "wheel":
          handleCommonWheel(ctx, event);
          return;
        case "selection": {
          return newSelectionHubState;
        }
        case "shape-updated": {
          if (event.data.keys.has(lineShape.id)) {
            return newSelectionHubState;
          }
          return;
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return newSelectionHubState;
        case "state":
          switch (event.data.name) {
            case "AddingLineLabel": {
              const textshapeSrc = createShape<TextShape>(ctx.getShapeStruct, "text", {
                id: ctx.generateUuid(),
                findex: ctx.createLastIndex(),
                parentId: lineShape.id,
                vAlign: "center",
                hAlign: "center",
                lineAttached: 0.5,
              });
              const textshape = {
                ...textshapeSrc,
                ...patchPosition(textshapeSrc, getRelativePointOn(lineShape, 0.5)),
              };
              ctx.addShapes([textshape]);
              ctx.selectShape(textshape.id);
              return () => newTextEditingState({ id: textshape.id });
            }
            default:
              return handleStateEvent(ctx, event, ["DroppingNewShape", "LineReady", "TextReady"]);
          }
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
      lineBounding.render(renderCtx, ctx.getScale());
    },
  };
}
