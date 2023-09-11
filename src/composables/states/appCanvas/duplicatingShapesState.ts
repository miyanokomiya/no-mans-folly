import type { AppCanvasState } from "./core";
import { Shape } from "../../../models";
import {
  cloneShapes,
  filterShapesOverlappingRect,
  getSnappingLines,
  getWrapperRect,
  renderShape,
  resizeShape,
} from "../../../shapes";
import { AffineMatrix, IRectangle, add, moveRect, sub } from "okageo";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { isLineShape } from "../../../shapes/line";
import * as geometry from "../../../utils/geometry";
import { translateOnSelection } from "./commons";

// Add extra distance to make duplicated shapes' existence clear.
const EXTRA_DISTANCE = 10;

// TODO: Duplicate documents
export function newDuplicatingShapesState(): AppCanvasState {
  let shapes: Shape[] = [];
  let shapeSnapping: ShapeSnapping;
  let movingRect: IRectangle;
  let snappingResult: SnappingResult | undefined;
  let affine: AffineMatrix = [1, 0, 0, 1, EXTRA_DISTANCE, EXTRA_DISTANCE];

  return {
    getLabel: () => "DuplicatingShapes",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCursor("grabbing");

      const shapeMap = ctx.getShapeMap();
      const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
      const snappableShapes = filterShapesOverlappingRect(
        ctx.getShapeStruct,
        Object.values(shapeMap).filter((s) => !isLineShape(s)),
        ctx.getViewRect()
      );
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, getSnappingLines(ctx.getShapeStruct, s)]),
        scale: ctx.getScale(),
      });
      movingRect = geometry.getWrapperRect(selectedIds.map((id) => getWrapperRect(ctx.getShapeStruct, shapeMap[id])));

      shapes = cloneShapes(
        ctx.getShapeStruct,
        selectedIds.map((id) => shapeMap[id]),
        ctx.generateUuid
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
          affine = [1, 0, 0, 1, translate.x, translate.y];
          ctx.setTmpShapeMap({});
          return;
        }
        case "pointerup": {
          const moved = shapes.map((s) => ({ ...s, ...resizeShape(ctx.getShapeStruct, s, affine) }));
          ctx.addShapes(moved);
          ctx.multiSelectShapes(moved.map((s) => s.id));
          return translateOnSelection(ctx);
        }
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      renderCtx.globalAlpha = 0.5;
      shapes.forEach((s) => {
        renderShape(ctx.getShapeStruct, renderCtx, { ...s, ...resizeShape(ctx.getShapeStruct, s, affine) });
      });
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
