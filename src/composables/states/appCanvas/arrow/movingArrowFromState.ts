import type { AppCanvasState } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { TAU } from "../../../../utils/geometry";
import { add } from "okageo";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../../shapeSnapping";
import { ArrowCommonShape, getArrowHeadPoint, patchToMoveTail } from "../../../../utils/arrows";

interface Option {
  targetId: string;
}

export function newMovingArrowFromState(option: Option): AppCanvasState {
  let targetShape: ArrowCommonShape;
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;

  return {
    getLabel: () => "MovingArrowFrom",
    onStart: (ctx) => {
      targetShape = ctx.getShapeComposite().shapeMap[option.targetId] as ArrowCommonShape;
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
          const patch = patchToMoveTail(targetShape, p);
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
      const tmpShape: ArrowCommonShape = { ...targetShape, ...ctx.getTmpShapeMap()[targetShape.id] };
      const headP = getArrowHeadPoint(tmpShape);
      applyFillStyle(renderCtx, { color: ctx.getStyleScheme().selectionSecondaly });
      renderCtx.beginPath();
      renderCtx.arc(headP.x, headP.y, 6 * ctx.getScale(), 0, TAU);
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
