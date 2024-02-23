import type { AppCanvasState } from "./core";
import { newSelectionHubState } from "./selectionHubState";
import { applyFillStyle } from "../../../utils/fillStyle";
import { TAU } from "../../../utils/geometry";
import { IVec2, add } from "okageo";
import { getPatchByLayouts } from "../../shapeLayoutHandler";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { Shape } from "../../../models";

interface Option<T extends Shape> {
  targetId: string;
  /**
   * "p" is in the global space.
   */
  patchFn: (s: T, p: IVec2) => Partial<T>;
  /**
   * Should return a point in the global space.
   */
  getControlFn: (s: T) => IVec2;
}

export function movingShapeControlState<T extends Shape>(option: Option<T>): AppCanvasState {
  let targetShape: T;
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;

  return {
    getLabel: () => "MovingShapeControl",
    onStart: (ctx) => {
      targetShape = ctx.getShapeComposite().shapeMap[option.targetId] as T;
      if (!targetShape) return newSelectionHubState;

      ctx.startDragging();

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const snappableLines = shapeComposite.getShapesOverlappingRect(Object.values(shapeMap), ctx.getViewRect());
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableLines.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });
    },
    onEnd: (ctx) => {
      ctx.setTmpShapeMap({});
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const point = event.data.current;
          snappingResult = event.data.ctrl ? undefined : shapeSnapping.testPoint(point);
          const p = snappingResult ? add(point, snappingResult.diff) : point;
          const patch = option.patchFn(targetShape, p);
          const shapeComposite = ctx.getShapeComposite();
          const layoutPatch = getPatchByLayouts(shapeComposite, {
            update: { [targetShape.id]: patch },
          });
          ctx.setTmpShapeMap(layoutPatch);
          return;
        }
        case "pointerup": {
          ctx.patchShapes(ctx.getTmpShapeMap());
          return newSelectionHubState;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const tmpShape: T = { ...targetShape, ...ctx.getTmpShapeMap()[targetShape.id] };
      const control = option.getControlFn(tmpShape);
      applyFillStyle(renderCtx, { color: ctx.getStyleScheme().selectionSecondaly });
      renderCtx.beginPath();
      renderCtx.arc(control.x, control.y, 6 * ctx.getScale(), 0, TAU);
      renderCtx.fill();

      if (snappingResult) {
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
        });
      }
    },
  };
}
