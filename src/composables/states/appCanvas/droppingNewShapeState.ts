import type { AppCanvasState } from "./core";
import { Shape } from "../../../models";
import { canHaveText, getWrapperRect } from "../../../shapes";
import { IRectangle, IVec2, add, sub } from "okageo";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { isLineShape } from "../../../shapes/line";
import { getInitialOutput } from "../../../utils/textEditor";
import { newShapeComposite } from "../../shapeComposite";
import { newSelectionHubState } from "./selectionHubState";
import * as geometry from "../../../utils/geometry";
import { mapReduce, toMap } from "../../../utils/commons";

interface Option {
  shapes: Shape[];
}

export function newDroppingNewShapeState(option: Option): AppCanvasState {
  const shapes = option.shapes;
  let p: IVec2; // represents the center of the shapes
  let shapeSnapping: ShapeSnapping;
  let movingRect: IRectangle;
  let snappingResult: SnappingResult | undefined;

  function updateP(topLeft: IVec2) {
    const rectSize = { width: movingRect.width / 2, height: movingRect.height / 2 };
    p = sub(topLeft, { x: rectSize.width, y: rectSize.height });
  }

  function getDiff(): IVec2 {
    return sub(p, movingRect);
  }

  return {
    getLabel: () => "DroppingNewShape",
    onStart: (ctx) => {
      ctx.clearAllSelected();
      ctx.startDragging();
      ctx.setCursor("grabbing");

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const snappableShapes = shapeComposite.getShapesOverlappingRect(
        Object.values(shapeMap).filter((s) => !isLineShape(s)),
        ctx.getViewRect(),
      );
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });
      movingRect = geometry.getWrapperRect(shapes.map((s) => getWrapperRect(shapeComposite.getShapeStruct, s)));
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
        case "pointerup": {
          const diff = getDiff();
          ctx.addShapes(
            shapes.map((s) => ({ ...s, p: add(s.p, diff) })),
            // Newly created shapes should have doc by default.
            // => It useful to apply text style even it has no content.
            mapReduce(toMap(shapes.filter((s) => canHaveText(ctx.getShapeStruct, s))), () => getInitialOutput()),
          );
          ctx.multiSelectShapes(shapes.map((s) => s.id));
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
      const diff = getDiff();
      const shapeComposite = newShapeComposite({
        shapes: shapes.map((s) => ({ ...s, p: add(s.p, diff) })),
        getStruct: ctx.getShapeStruct,
      });
      shapeComposite.shapes.forEach((s) => {
        shapeComposite.render(renderCtx, s);
      });

      if (snappingResult) {
        const shapeComposite = ctx.getShapeComposite();
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
          getTargetRect: (id) => shapeComposite.getWrapperRect(shapeComposite.shapeMap[id]),
        });
      }
    },
  };
}
