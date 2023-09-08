import type { AppCanvasState } from "./core";
import { translateOnSelection } from "./commons";
import { Shape } from "../../../models";
import { getSnappingLines, getWrapperRect, renderShape } from "../../../shapes";
import { newSingleSelectedState } from "./singleSelectedState";
import { IRectangle, IVec2, add, sub } from "okageo";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { isLineShape } from "../../../shapes/line";

interface Option {
  shape: Shape;
}

export function newDroppingNewShapeState(option: Option): AppCanvasState {
  const shape = option.shape;
  let p: IVec2 | undefined; // represents the center of the shape
  let shapeSnapping: ShapeSnapping;
  let movingRect: IRectangle;
  let snappingResult: SnappingResult | undefined;

  return {
    getLabel: () => "DroppingNewShape",
    onStart: async (ctx) => {
      ctx.startDragging();
      ctx.setCursor("move");

      const shapeMap = ctx.getShapeMap();
      const selectedIds = ctx.getSelectedShapeIdMap();
      const snappableShapes = Object.values(shapeMap).filter((s) => !selectedIds[s.id] && !isLineShape(s));
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, getSnappingLines(ctx.getShapeStruct, s)]),
        scale: ctx.getScale(),
      });
      movingRect = getWrapperRect(ctx.getShapeStruct, shape);
    },
    onEnd: async (ctx) => {
      ctx.stopDragging();
      ctx.setCursor();
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const rectSize = { width: movingRect.width / 2, height: movingRect.height / 2 };

          snappingResult = shapeSnapping.test({
            ...movingRect,
            x: event.data.current.x - rectSize.width,
            y: event.data.current.y - rectSize.height,
          });
          const adjustedCurrent = snappingResult ? add(event.data.current, snappingResult.diff) : event.data.current;

          p = sub(adjustedCurrent, { x: rectSize.width, y: rectSize.height });
          ctx.setTmpShapeMap({});
          return;
        }
        case "pointerup":
          if (!p) return translateOnSelection(ctx);

          ctx.addShapes([{ ...shape, p }]);
          ctx.selectShape(shape.id);
          return newSingleSelectedState;
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      if (!p) return;
      renderShape(ctx.getShapeStruct, renderCtx, { ...shape, p });

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
