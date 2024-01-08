import type { AppCanvasState } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { OneSidedArrowShape, getTailControlPoint } from "../../../../shapes/oneSidedArrow";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { TAU, getRotateFn } from "../../../../utils/geometry";
import { add, clamp, sub } from "okageo";

interface Option {
  targetId: string;
}

export function newMovingArrowTailState(option: Option): AppCanvasState {
  let targetShape: OneSidedArrowShape;

  return {
    getLabel: () => "MovingArrowTail",
    onStart: (ctx) => {
      targetShape = ctx.getShapeComposite().shapeMap[option.targetId] as OneSidedArrowShape;
      if (!targetShape) return newSelectionHubState;

      ctx.startDragging();
    },
    onEnd: (ctx) => {
      ctx.setTmpShapeMap({});
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const diff = sub(event.data.current, event.data.start);
          const rotateFn = getRotateFn(targetShape.rotation, {
            x: targetShape.p.x + targetShape.width / 2,
            y: targetShape.p.y + targetShape.height / 2,
          });
          const p = add(getTailControlPoint(targetShape), diff);
          const adjustedP = rotateFn(p, true);
          const origin = targetShape.p.y + targetShape.height / 2;
          const value = origin - adjustedP.y;
          const maxH = targetShape.height / 2;
          const nextControl = {
            x: 0,
            y: clamp(0, 1, value / maxH),
          };
          ctx.setTmpShapeMap({
            [targetShape.id]: { tailControl: nextControl } as Partial<OneSidedArrowShape>,
          });
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
      const tmpShape: OneSidedArrowShape = { ...targetShape, ...ctx.getTmpShapeMap()[targetShape.id] };
      const tailControlP = getTailControlPoint(tmpShape);
      applyFillStyle(renderCtx, { color: ctx.getStyleScheme().selectionSecondaly });
      renderCtx.beginPath();
      renderCtx.arc(tailControlP.x, tailControlP.y, 6 * ctx.getScale(), 0, TAU);
      renderCtx.fill();
    },
  };
}
