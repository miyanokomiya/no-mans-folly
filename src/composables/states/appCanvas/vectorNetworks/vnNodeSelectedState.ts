import { createShape } from "../../../../shapes";
import { LineShape } from "../../../../shapes/line";
import { VnNodeShape } from "../../../../shapes/vectorNetworks/vnNode";
import { TAU } from "../../../../utils/geometry";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { newVnNodeHandler, VnNodeHandler } from "../../../shapeHandlers/vnNodeHandler";
import { generateFindexBefore } from "../../../shapeRelation";
import { getAnyConnectedLineInfoAtNode } from "../../../vectorNetwork";
import {
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
} from "../commons";
import { getMenuItemsForSelectedShapes } from "../contextMenuItems";
import { AppCanvasState } from "../core";
import { defineIntransientState } from "../intransientState";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";

export const newVNNodeSelectedState = defineIntransientState(getState);

function getState(): AppCanvasState {
  let shape: VnNodeShape;
  let shapeHandler: VnNodeHandler;

  const render: AppCanvasState["render"] = (ctx, renderCtx) => {
    const style = ctx.getStyleScheme();
    const scale = ctx.getScale();
    applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: 3 * scale });
    renderCtx.beginPath();
    renderCtx.arc(shape.p.x, shape.p.y, shape.r, 0, TAU);
    renderCtx.stroke();
    shapeHandler.render(renderCtx, style, scale);
  };

  return {
    getLabel: () => "VNNodeSelected",
    onStart(ctx) {
      shape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as VnNodeShape;
      shapeHandler = newVnNodeHandler({ getShapeComposite: () => ctx.getShapeComposite(), targetId: shape.id });
      ctx.showFloatMenu();
    },
    onEnd(ctx) {
      ctx.hideFloatMenu();
      ctx.setCommandExams();
      ctx.setContextMenuList();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown": {
          switch (event.data.options.button) {
            case 0: {
              const hitResult = shapeHandler.hitTest(event.data.point, ctx.getScale());
              switch (hitResult?.type) {
                case "move":
                  return ctx.states.newMovingHubState;
                case "new-edge": {
                  const sc = ctx.getShapeComposite();
                  const p = shape.p;
                  const connectedInfo = getAnyConnectedLineInfoAtNode(sc, shape.id);
                  const siblingLine = connectedInfo ? (sc.shapeMap[connectedInfo[0]] as LineShape) : undefined;
                  const newLine = createShape<LineShape>(ctx.getShapeStruct, "line", {
                    id: ctx.generateUuid(),
                    findex: generateFindexBefore(sc, shape.id),
                    p,
                    q: p,
                    pConnection: { id: shape.id, rate: { x: 0.5, y: 0.5 } },
                    stroke: siblingLine?.stroke,
                    fill: siblingLine?.fill,
                    parentId: siblingLine?.parentId,
                    alpha: siblingLine?.alpha,
                  });
                  return () => ctx.states.newVnEdgeDrawingState({ shape: newLine });
                }
              }

              return handleCommonPointerDownLeftOnSingleSelection(
                ctx,
                event,
                shape.id,
                ctx.getShapeComposite().getSelectionScope(shape),
                [shape.id],
                render,
              );
            }
            case 1:
              return () => newPointerDownEmptyState({ ...event.data.options, renderWhilePanning: render });
            case 2: {
              return handleCommonPointerDownRightOnSingleSelection(
                ctx,
                event,
                shape.id,
                ctx.getShapeComposite().getSelectionScope(shape),
                [shape.id],
              );
            }
            default:
              return;
          }
        }
        case "pointerhover": {
          const hitResult = shapeHandler.hitTest(event.data.current, ctx.getScale());
          if (shapeHandler.saveHitResult(hitResult)) {
            ctx.redraw();
          }
          break;
        }
        case "contextmenu": {
          ctx.setContextMenuList({
            items: getMenuItemsForSelectedShapes(ctx),
            point: event.data.point,
          });
          return;
        }
        default:
          return handleIntransientEvent(ctx, event);
      }
    },
    render,
  };
}
