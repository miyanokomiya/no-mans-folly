import type { AppCanvasState } from "./core";
import { translateOnSelection } from "./commons";
import { IDENTITY_AFFINE, IRectangle, add, moveRect, sub } from "okageo";
import { Shape } from "../../../models";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { getSnappingLines, getWrapperRect, resizeShape } from "../../../shapes";
import * as geometry from "../../../utils/geometry";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import {
  ConnectedLineHandler,
  getConnectedLineInfoMap,
  getRotatedRectPathMap,
  newConnectedLineHandler,
} from "../../connectedLineHandler";
import { mergeMap } from "../../../utils/commons";

interface Option {
  boundingBox?: BoundingBox;
}

export function newMovingShapeState(option?: Option): AppCanvasState {
  let shapeSnapping: ShapeSnapping;
  let movingRect: IRectangle;
  let boundingBox: BoundingBox;
  let snappingResult: SnappingResult | undefined;
  let affine = IDENTITY_AFFINE;
  let lineHandler: ConnectedLineHandler;

  return {
    getLabel: () => "MovingShape",
    onStart: async (ctx) => {
      ctx.startDragging();
      ctx.setCursor("move");

      const shapeMap = ctx.getShapeMap();
      const selectedIds = ctx.getSelectedShapeIdMap();
      const snappableShapes = Object.values(shapeMap).filter((s) => !selectedIds[s.id]);
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, getSnappingLines(ctx.getShapeStruct, s)]),
        scale: ctx.getScale(),
      });
      movingRect = geometry.getWrapperRect(
        Object.keys(selectedIds).map((id) => getWrapperRect(ctx.getShapeStruct, shapeMap[id]))
      );

      if (option?.boundingBox) {
        boundingBox = option.boundingBox;
      } else {
        const shapeRects = Object.keys(selectedIds)
          .map((id) => shapeMap[id])
          .map((s) => getWrapperRect(ctx.getShapeStruct, s));

        boundingBox = newBoundingBox({
          path: geometry.getRectPoints(geometry.getWrapperRect(shapeRects)),
          styleScheme: ctx.getStyleScheme(),
          scale: ctx.getScale(),
        });
      }

      lineHandler = newConnectedLineHandler({
        connectedLinesMap: getConnectedLineInfoMap(ctx),
      });
    },
    onEnd: async (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
      ctx.setCursor();
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const d = sub(event.data.current, event.data.start);
          snappingResult = shapeSnapping.test(moveRect(movingRect, d));
          const translate = snappingResult ? add(d, snappingResult.diff) : d;
          affine = [1, 0, 0, 1, translate.x, translate.y];

          const shapeMap = ctx.getShapeMap();
          const updatedMap = Object.keys(ctx.getSelectedShapeIdMap()).reduce<{ [id: string]: Partial<Shape> }>(
            (m, id) => {
              const s = shapeMap[id];
              if (s) m[id] = resizeShape(ctx.getShapeStruct, s, affine);
              return m;
            },
            {}
          );

          const linePatchedMap = lineHandler.onModified(getRotatedRectPathMap(ctx, updatedMap));

          ctx.setTmpShapeMap(mergeMap(updatedMap, linePatchedMap));
          return;
        }
        case "pointerup": {
          const val = ctx.getTmpShapeMap();
          if (Object.keys(val).length > 0) {
            ctx.patchShapes(val);
          }
          return translateOnSelection(ctx);
        }
        case "selection": {
          return translateOnSelection(ctx);
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      boundingBox.render(renderCtx, affine);
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
