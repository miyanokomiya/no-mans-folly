import type { AppCanvasState } from "./core";
import { Shape } from "../../../models";
import {
  duplicateShapes,
  filterShapesOverlappingRect,
  getSnappingLines,
  getWrapperRect,
  resizeShape,
} from "../../../shapes";
import { AffineMatrix, IRectangle, add, moveRect, sub } from "okageo";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { isLineShape } from "../../../shapes/line";
import * as geometry from "../../../utils/geometry";
import { newSelectionHubState } from "./selectionHubState";
import { DocOutput } from "../../../models/document";
import { newShapeRenderer } from "../../shapeRenderer";
import { getAllBranchIds, getTree } from "../../../utils/tree";
import { newShapeComposite } from "../../shapeComposite";

// Add extra distance to make duplicated shapes' existence clear.
const EXTRA_DISTANCE = -10;

export function newDuplicatingShapesState(): AppCanvasState {
  let duplicated: { shapes: Shape[]; docMap: { [id: string]: DocOutput } };
  let shapeSnapping: ShapeSnapping;
  let movingRect: IRectangle;
  let snappingResult: SnappingResult | undefined;
  let tmpShapeMap: { [id: string]: Partial<Shape> } = {};

  return {
    getLabel: () => "DuplicatingShapes",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCursor("grabbing");

      const shapeMap = ctx.getShapeMap();
      const snappableShapes = filterShapesOverlappingRect(
        ctx.getShapeStruct,
        Object.values(shapeMap).filter((s) => !isLineShape(s)),
        ctx.getViewRect()
      );

      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, getSnappingLines(ctx.getShapeStruct, s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });

      const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
      movingRect = geometry.getWrapperRect(selectedIds.map((id) => getWrapperRect(ctx.getShapeStruct, shapeMap[id])));

      // Collect all related shape ids
      const targetIds = getAllBranchIds(getTree(Object.values(shapeMap)), selectedIds);

      const docMap = ctx.getDocumentMap();
      duplicated = duplicateShapes(
        targetIds.map((id) => shapeMap[id]),
        targetIds.filter((id) => !!docMap[id]).map((id) => [id, docMap[id]]),
        ctx.generateUuid,
        ctx.createLastIndex(),
        new Set(Object.keys(shapeMap))
      );

      ctx.clearAllSelected();
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setCursor();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const d = sub(
            { x: event.data.current.x + EXTRA_DISTANCE, y: event.data.current.y + EXTRA_DISTANCE },
            event.data.start
          );
          snappingResult = shapeSnapping.test(moveRect(movingRect, d));
          const translate = snappingResult ? add(d, snappingResult.diff) : d;
          const affine: AffineMatrix = [1, 0, 0, 1, translate.x, translate.y];
          tmpShapeMap = {};
          duplicated.shapes.forEach((s) => {
            tmpShapeMap[s.id] = resizeShape(ctx.getShapeStruct, s, affine);
          });
          ctx.setTmpShapeMap({});
          return;
        }
        case "pointerup": {
          const moved = duplicated.shapes.map((s) => ({ ...s, ...(tmpShapeMap[s.id] ?? {}) }));
          ctx.addShapes(moved, duplicated.docMap);
          ctx.multiSelectShapes(moved.map((s) => s.id));
          return newSelectionHubState;
        }
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const renderer = newShapeRenderer({
        shapeComposite: newShapeComposite({ shapes: duplicated.shapes, tmpShapeMap }),
        getDocumentMap: () => duplicated.docMap,
        getShapeStruct: ctx.getShapeStruct,
      });
      renderCtx.globalAlpha = 0.5;
      renderer.render(renderCtx);
      renderCtx.globalAlpha = 1;

      if (snappingResult) {
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
          getTargetRect: (id) => getWrapperRect(ctx.getShapeStruct, ctx.getShapeMap()[id]),
        });
      }
    },
  };
}
