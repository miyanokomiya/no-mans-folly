import { IRectangle, getOuterRectangle } from "okageo";
import type { AppCanvasState } from "./core";
import { newRectInRectHitTest } from "../../shapeHitTest";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { applyPath, scaleGlobalAlpha } from "../../../utils/renderer";
import { newSelectionHubState } from "./selectionHubState";
import { isTransparentSelection } from "../../../shapes";
import { ShapeSelectionScope } from "../../../shapes/core";
import { handleCommonWheel } from "./commons";
import { newAutoPanningState } from "../autoPanningState";
import { COMMAND_EXAM_SRC } from "./commandExams";
import { applyFillStyle } from "../../../utils/fillStyle";
import { splitList } from "../../../utils/commons";

interface Option {
  keepSelection?: boolean;
}

export function newRectangleSelectingState(option?: Option): AppCanvasState {
  const keepSelection = option?.keepSelection ?? false;
  let rectangle: IRectangle;
  let targetIdSet = new Set<string>();
  let selectionScope: ShapeSelectionScope | null | undefined; // null: root scope, undefined: root scope but not determined
  let hasInitialSelectionScope: boolean;

  const getScope = () => {
    return selectionScope ? selectionScope : undefined;
  };

  return {
    getLabel: () => "RectangleSelecting",
    onStart: (ctx) => {
      ctx.setCommandExams([COMMAND_EXAM_SRC.PAN_TO_AREA]);
      ctx.startDragging();
      if (!keepSelection) {
        ctx.clearAllSelected();
      }
      const shapeComposite = ctx.getShapeComposite();
      const lastSelectedId = ctx.getLastSelectedShapeId();
      if (lastSelectedId) {
        selectionScope = shapeComposite.getSelectionScope(shapeComposite.shapeMap[lastSelectedId]);
      }
      hasInitialSelectionScope = !!selectionScope;
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          rectangle = getOuterRectangle([[event.data.start, event.data.current]]);
          const hitTest = newRectInRectHitTest(rectangle);
          const composite = ctx.getShapeComposite();
          const shapeMap = composite.mergedShapeMap;

          let currentScope = getScope();

          if (currentScope?.parentId) {
            // Prioritize the parent scope when the parent of the current scope is covered by the range.
            const scopeParent = composite.shapeMap[currentScope.parentId];
            if (hitTest.test(composite.getWrapperRect(scopeParent))) {
              selectionScope = composite.getSelectionScope(scopeParent);
              currentScope = selectionScope;
            }
          }

          const candidateIds = currentScope
            ? composite.getMergedShapesInSelectionScope(currentScope).map((s) => s.id)
            : composite.mergedShapeTree.flatMap((t) => {
                const shape = shapeMap[t.id];
                if (isTransparentSelection(composite.getShapeStruct, shape)) {
                  return [t.id, ...t.children.map((c) => c.id)];
                } else {
                  return [t.id];
                }
              });

          targetIdSet = new Set(
            candidateIds
              .map<[string, IRectangle]>((id) => [id, composite.getWrapperRect(shapeMap[id])])
              .filter(([, rect]) => hitTest.test(rect))
              .map(([id]) => id),
          );

          if (targetIdSet.size === 0) {
            // Get rid of the scope if this state originally had no scope.
            if (!hasInitialSelectionScope) {
              selectionScope = undefined;
            }
          } else if (targetIdSet.size === 1) {
            const id = Array.from(targetIdSet)[0];
            selectionScope = composite.getSelectionScope(shapeMap[id]) ?? null;
          } else if (selectionScope === null) {
            // When the scope is determined to root, only root shapes should be selected.
            // => Ignore transparent scope
            Array.from(targetIdSet).forEach((id) => {
              if (shapeMap[id].parentId) {
                targetIdSet.delete(id);
              }
            });
          } else {
            // Pick a scope if any selected shape has a parent.
            const hasParentId = Array.from(targetIdSet).find((id) => composite.getSelectionScope(shapeMap[id]));
            // If no shape has a parent, determine root as curreent scope.
            selectionScope = hasParentId ? composite.getSelectionScope(shapeMap[hasParentId]) : null;
          }

          const nextScope = getScope();
          if (nextScope?.parentId) {
            // When the scope exists, the parent shouldn't be selected.
            targetIdSet.delete(nextScope.parentId);
          }

          ctx.redraw();
          return;
        }
        case "pointerup":
          if (rectangle && targetIdSet.size > 0) {
            ctx.multiSelectShapes(Array.from(targetIdSet), keepSelection);
          }
          return newSelectionHubState;
        case "wheel":
          handleCommonWheel(ctx, event);
          return;
        case "keydown": {
          switch (event.data.key) {
            case "!":
            case "Home": {
              return () => newAutoPanningState({ viewRect: rectangle, duration: 100 });
            }
            default:
              return;
          }
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      if (!rectangle) return;

      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const composite = ctx.getShapeComposite();
      const selectedIds = ctx.getSelectedShapeIdMap();
      const shapes = Object.entries(composite.mergedShapeMap)
        .filter(([id]) => selectedIds[id] || targetIdSet.has(id))
        .map(([, s]) => s);

      const [unlocked, locked] = splitList(shapes, (s) => !s.locked);

      applyStrokeStyle(renderCtx, { color: style.locked, width: 2 * scale });
      renderCtx.beginPath();
      locked.forEach((s) => applyPath(renderCtx, composite.getLocalRectPolygon(s), true));
      renderCtx.stroke();

      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 3 * scale });
      renderCtx.beginPath();
      unlocked.forEach((s) => applyPath(renderCtx, composite.getLocalRectPolygon(s), true));
      renderCtx.stroke();

      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      scaleGlobalAlpha(renderCtx, 0.05, () => {
        renderCtx.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
      });
      applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: 2 * scale });
      renderCtx.strokeRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    },
  };
}
