import type { AppCanvasState } from "./core";
import { Shape } from "../../../models";
import {
  canHaveText,
  filterShapesOverlappingRect,
  getSnappingLines,
  getWrapperRect,
  renderShape,
} from "../../../shapes";
import { newSingleSelectedState } from "./singleSelectedState";
import { IRectangle, IVec2, add, sub } from "okageo";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { isLineShape } from "../../../shapes/line";
import { getInitialOutput } from "../../../utils/textEditor";

interface Option {
  shape: Shape;
}

export function newDroppingNewShapeState(option: Option): AppCanvasState {
  const shape = option.shape;
  let p: IVec2; // represents the center of the shape
  let shapeSnapping: ShapeSnapping;
  let movingRect: IRectangle;
  let snappingResult: SnappingResult | undefined;

  function updateP(topLeft: IVec2) {
    const rectSize = { width: movingRect.width / 2, height: movingRect.height / 2 };
    p = sub(topLeft, { x: rectSize.width, y: rectSize.height });
  }

  return {
    getLabel: () => "DroppingNewShape",
    onStart: (ctx) => {
      ctx.clearAllSelected();
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
      });
      movingRect = getWrapperRect(ctx.getShapeStruct, shape);
      updateP(ctx.getCursorPoint());
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setCursor();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const rectSize = { width: movingRect.width / 2, height: movingRect.height / 2 };

          snappingResult = shapeSnapping.test({
            ...movingRect,
            x: event.data.current.x - rectSize.width,
            y: event.data.current.y - rectSize.height,
          });
          const adjustedCurrent = snappingResult ? add(event.data.current, snappingResult.diff) : event.data.current;

          updateP(adjustedCurrent);
          ctx.setTmpShapeMap({});
          return;
        }
        case "pointerup":
          ctx.addShapes(
            [{ ...shape, p }],
            // Newly created shape should have doc by default.
            // => It useful to apply text style even it has no content.
            canHaveText(ctx.getShapeStruct, shape) ? { [shape.id]: getInitialOutput() } : undefined
          );
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
