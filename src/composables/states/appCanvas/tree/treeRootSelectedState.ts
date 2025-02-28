import {
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
} from "../commons";
import { getMenuItemsForSelectedShapes } from "../contextMenuItems";
import { TreeRootShape } from "../../../../shapes/tree/treeRoot";
import { getLocalMarginAnchorPoints, newTreeHandler } from "../../../shapeHandlers/treeHandler";
import { canHaveText, createShape } from "../../../../shapes";
import { TreeNodeShape } from "../../../../shapes/tree/treeNode";
import { getInitialOutput } from "../../../../utils/textEditor";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { BoundingBox, newBoundingBox } from "../../../boundingBox";
import { newResizingState } from "../resizingState";
import { newRotatingState } from "../rotatingState";
import { defineIntransientState } from "../intransientState";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { movingShapeControlState } from "../movingShapeControlState";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/rectPolygon";
import { applyAffine, clamp } from "okageo";
import { applyPath, renderValueLabel } from "../../../../utils/renderer";
import { getRotatedTargetBounds } from "../../../shapeComposite";
import { AppCanvasState } from "../core";

export const newTreeRootSelectedState = defineIntransientState(() => {
  let treeRootShape: TreeRootShape;
  let treeHandler: ReturnType<typeof newTreeHandler>;
  let boundingBox: BoundingBox;

  const render: AppCanvasState["render"] = (ctx, renderCtx) => {
    const shapeComposite = ctx.getShapeComposite();
    applyStrokeStyle(renderCtx, { color: ctx.getStyleScheme().selectionSecondaly, width: ctx.getScale() * 2 });

    const path = getRotatedTargetBounds(
      shapeComposite,
      shapeComposite.getAllBranchMergedShapes([treeRootShape.id]).map((s) => s.id),
      treeRootShape.rotation,
    );
    renderCtx.beginPath();
    applyPath(renderCtx, path, true);
    renderCtx.stroke();

    treeHandler.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
    boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
  };

  return {
    getLabel: () => "TreeRootSelected",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      treeRootShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as TreeRootShape;
      ctx.setCommandExams([]);
      treeHandler = newTreeHandler({ getShapeComposite: ctx.getShapeComposite, targetId: treeRootShape.id });

      const shapeComposite = ctx.getShapeComposite();
      boundingBox = newBoundingBox({
        path: shapeComposite.getLocalRectPolygon(treeRootShape),
        locked: treeRootShape.locked,
      });
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setCursor();
      ctx.setCommandExams();
      ctx.setContextMenuList();
    },
    handleEvent: (ctx, event) => {
      if (!treeRootShape) return ctx.states.newSelectionHubState;

      switch (event.type) {
        case "pointerdown":
          ctx.setContextMenuList();

          switch (event.data.options.button) {
            case 0: {
              const treeHitResult = treeHandler.hitTest(event.data.point, ctx.getScale());
              treeHandler.saveHitResult(treeHitResult);
              if (treeHitResult) {
                if (treeHitResult.type === -1) {
                  return;
                }
                if (treeHitResult.direction === "margin") {
                  if (treeHitResult.type === "sibling-margin") {
                    return () => {
                      let showLabel = false;
                      return movingShapeControlState<TreeRootShape>({
                        targetId: treeRootShape.id,
                        snapType: "custom",
                        patchFn: (shape, p, movement) => {
                          const detransform = getShapeDetransform(shape);
                          const localP = applyAffine(detransform, p);
                          let nextSize = clamp(0, 200, localP.y);

                          if (movement.ctrl) {
                            showLabel = false;
                          } else {
                            nextSize = Math.round(nextSize);
                            showLabel = true;
                          }
                          return { siblingMargin: nextSize };
                        },
                        getControlFn: (shape, scale) => {
                          const [localP] = getLocalMarginAnchorPoints(shape, scale);
                          return applyAffine(getShapeTransform(shape), localP);
                        },
                        renderFn: (ctx, renderCtx, shape) => {
                          if (!showLabel) return;

                          const scale = ctx.getScale();
                          const [localP] = getLocalMarginAnchorPoints(shape, scale);
                          const p = applyAffine(getShapeTransform(shape), localP);
                          renderValueLabel(renderCtx, Math.round(shape.siblingMargin ?? 0), p, 0, scale);
                        },
                      });
                    };
                  }
                  if (treeHitResult.type === "child-margin") {
                    return () => {
                      let showLabel = false;
                      return movingShapeControlState<TreeRootShape>({
                        targetId: treeRootShape.id,
                        snapType: "custom",
                        patchFn: (shape, p, movement) => {
                          const detransform = getShapeDetransform(shape);
                          const localP = applyAffine(detransform, p);
                          let nextSize = clamp(0, 200, localP.x);

                          if (movement.ctrl) {
                            showLabel = false;
                          } else {
                            nextSize = Math.round(nextSize);
                            showLabel = true;
                          }
                          return { childMargin: nextSize };
                        },
                        getControlFn: (shape, scale) => {
                          const [, localP] = getLocalMarginAnchorPoints(shape, scale);
                          return applyAffine(getShapeTransform(shape), localP);
                        },
                        renderFn: (ctx, renderCtx, shape) => {
                          if (!showLabel) return;

                          const scale = ctx.getScale();
                          const [, localP] = getLocalMarginAnchorPoints(shape, scale);
                          const p = applyAffine(getShapeTransform(shape), localP);
                          renderValueLabel(renderCtx, Math.round(shape.childMargin ?? 0), p, 0, scale);
                        },
                      });
                    };
                  }
                  return;
                }

                const shapeComposite = ctx.getShapeComposite();
                let treeNode = createShape<TreeNodeShape>(shapeComposite.getShapeStruct, "tree_node", {
                  id: ctx.generateUuid(),
                  findex: ctx.createLastIndex(),
                  parentId: treeRootShape.id,
                  treeParentId: treeRootShape.id,
                  direction: treeHitResult.direction,
                  dropdown: treeHitResult.dropdown,
                });

                const patch = getPatchByLayouts(shapeComposite, { add: [treeNode] });
                treeNode = { ...treeNode, ...patch[treeNode.id] };
                delete patch[treeNode.id];

                ctx.addShapes(
                  [treeNode],
                  canHaveText(ctx.getShapeStruct, treeNode) ? { [treeNode.id]: getInitialOutput() } : undefined,
                  patch,
                );
                ctx.selectShape(treeNode.id);
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
                treeRootShape.id,
                ctx.getShapeComposite().getSelectionScope(treeRootShape),
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
                treeRootShape.id,
                ctx.getShapeComposite().getSelectionScope(treeRootShape),
              );
            }
            default:
              return;
          }
        case "pointerhover": {
          const result = treeHandler.hitTest(event.data.current, ctx.getScale());
          if (treeHandler.saveHitResult(result)) {
            ctx.redraw();
          }
          if (result) return;

          const hitBounding = boundingBox.hitTest(event.data.current, ctx.getScale());
          if (boundingBox.saveHitResult(hitBounding)) {
            ctx.redraw();
          }
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
