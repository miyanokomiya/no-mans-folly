import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { applyPath, scaleGlobalAlpha } from "../../../../utils/renderer";
import { applyFillStyle } from "../../../../utils/fillStyle";
import {
  findBetterShapeAt,
  getClosestShapeByType,
  getNextShapeComposite,
  newShapeComposite,
} from "../../../shapeComposite";
import { findexSortFn } from "../../../../utils/commons";
import { IVec2, add, sub } from "okageo";
import { newShapeRenderer } from "../../../shapeRenderer";
import { Shape } from "../../../../models";
import { BoundingBox } from "../../../boundingBox";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { generateKeyBetweenAllowSame } from "../../../../utils/findex";
import { canJoinGeneralLayout } from "../../../shapeHandlers/layoutHandler";
import {
  generateTableMeta,
  MovingInTableHandler,
  MovingInTableHitResult,
  newMovingInTableHandler,
} from "../../../shapeHandlers/tableHandler";
import { TableShape } from "../../../../shapes/table/table";
import { handleShapeUpdate } from "../utils/shapeUpdatedEventHandlers";

interface Option {
  boundingBox?: BoundingBox;
  tableId: string;
}

/**
 * This state is supposed to be stacked on "MovingShape".
 * => "startDragging" and other methods aren't called by this state because of that.
 */
export function newMovingShapeInTableState(option: Option): AppCanvasState {
  let shapes: Shape[];
  let tableId = option.tableId;
  let tableHandler: MovingInTableHandler;
  let hitResult: MovingInTableHitResult | undefined;
  let diff: IVec2;

  function initHandler(ctx: AppCanvasStateContext) {
    hitResult = undefined;
    tableHandler = newMovingInTableHandler({
      getShapeComposite: ctx.getShapeComposite,
      tableId: tableId,
    });
  }

  return {
    getLabel: () => "MovingShapeInTable",
    onStart: (ctx) => {
      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      shapes = ids
        .map((id) => shapeMap[id])
        .filter((s) => canJoinGeneralLayout(shapeComposite, s))
        .sort(findexSortFn);

      initHandler(ctx);
      ctx.setTmpShapeMap({});
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          if (event.data.ctrl) return { type: "break" };

          const shapeComposite = ctx.getShapeComposite();
          const scope = shapeComposite.getSelectionScope(shapes[0]);
          const shapeAtPoint = findBetterShapeAt(
            shapeComposite,
            event.data.current,
            scope,
            shapes.map((s) => s.id),
          );
          if (!shapeAtPoint) return { type: "break" };

          const tableShape = getClosestShapeByType<TableShape>(shapeComposite, shapeAtPoint.id, "table");
          if (!tableShape) {
            return { type: "break" };
          } else if (tableShape.id !== tableId) {
            // Switch to the closest table shape
            tableId = tableShape.id;
            initHandler(ctx);
          }

          diff = sub(event.data.current, event.data.startAbs);
          const result = tableHandler.hitTest(event.data.current);
          hitResult = result;
          ctx.redraw();
          return;
        }
        case "pointerup": {
          if (event.data.options.ctrl) return ctx.states.newSelectionHubState;

          const shapeComposite = ctx.getShapeComposite();
          if (!hitResult) {
            const patch = shapes.reduce<{ [id: string]: Partial<Shape> }>((p, s) => {
              p[s.id] = { parentId: undefined, parentMeta: undefined };
              return p;
            }, {});
            const nextComposite = getNextShapeComposite(shapeComposite, { update: patch });
            const layoutPatch = getPatchByLayouts(nextComposite, { update: patch });
            ctx.patchShapes(layoutPatch);
          } else {
            const findexTo = hitResult.findexBetween[1];
            const parentMeta = generateTableMeta(hitResult.coords);
            let findex = generateKeyBetweenAllowSame(hitResult.findexBetween[0], findexTo);
            const patch = shapes.reduce<{ [id: string]: Partial<Shape> }>((p, s) => {
              p[s.id] = { parentId: tableId, parentMeta, findex };
              findex = generateKeyBetweenAllowSame(findex, findexTo);
              return p;
            }, {});
            const layoutPatch = getPatchByLayouts(shapeComposite, { update: patch });
            ctx.patchShapes(layoutPatch);
          }
          return ctx.states.newSelectionHubState;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        case "shape-updated": {
          return handleShapeUpdate(ctx, event, [tableId]);
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const shapeComposite = ctx.getShapeComposite();

      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      shapes.forEach((s) => {
        const path = shapeComposite.getLocalRectPolygon(s);
        renderCtx.beginPath();
        applyPath(renderCtx, path);
        scaleGlobalAlpha(renderCtx, 0.3, () => {
          renderCtx.fill();
        });
      });

      tableHandler.render(renderCtx, style, ctx.getScale(), hitResult);

      if (diff) {
        const shapeRenderer = newShapeRenderer({
          shapeComposite: newShapeComposite({
            shapes: shapes.map((s) => ({ ...s, p: add(s.p, diff) })),
            getStruct: shapeComposite.getShapeStruct,
          }),
          getDocumentMap: ctx.getDocumentMap,
        });
        scaleGlobalAlpha(renderCtx, 0.5, () => {
          shapeRenderer.render(renderCtx);
        });
      }
    },
  };
}
