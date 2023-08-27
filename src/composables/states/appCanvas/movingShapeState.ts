import type { AppCanvasState } from "./core";
import { translateOnSelection } from "./commons";
import { IRectangle, add, moveRect, sub } from "okageo";
import { Shape } from "../../../models";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { getSnappingLines, getWrapperRect } from "../../../shapes";
import * as geometry from "../../../utils/geometry";

export function newMovingShapeState(): AppCanvasState {
  let shapeSnapping: ShapeSnapping;
  let movingRect: IRectangle;
  let snappingResult: SnappingResult | undefined;

  return {
    getLabel: () => "MovingShape",
    onStart: async (ctx) => {
      ctx.startDragging();
      ctx.setCursor("move");

      const shapeMap = ctx.getShapeMap();
      const selectedIdMap = ctx.getSelectedShapeIdMap();
      const snappableShapes = Object.values(shapeMap).filter((s) => !selectedIdMap[s.id]);
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, getSnappingLines(ctx.getShapeStruct, s)]),
        scale: ctx.getScale(),
      });
      movingRect = geometry.getWrapperRect(
        Object.keys(selectedIdMap).map((id) => getWrapperRect(ctx.getShapeStruct, shapeMap[id]))
      );
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
          const adjustedD = snappingResult ? add(d, snappingResult.diff) : d;

          const shapeMap = ctx.getShapeMap();
          ctx.setTmpShapeMap(
            Object.keys(ctx.getSelectedShapeIdMap()).reduce<{ [id: string]: Partial<Shape> }>((m, id) => {
              const s = shapeMap[id];
              if (s) {
                m[id] = { p: add(s.p, adjustedD) };
              }
              return m;
            }, {})
          );
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
