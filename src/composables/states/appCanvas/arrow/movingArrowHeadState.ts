import type { AppCanvasState } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { OneSidedArrowShape, getHeadControlPoint } from "../../../../shapes/oneSidedArrow";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { TAU, getRotateFn } from "../../../../utils/geometry";
import { add, clamp, sub } from "okageo";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";

interface Option {
  targetId: string;
}

export function newMovingArrowHeadState(option: Option): AppCanvasState {
  let targetShape: OneSidedArrowShape;

  return {
    getLabel: () => "MovingArrowHead",
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
          const p = add(getHeadControlPoint(targetShape), diff);
          const adjustedP = rotateFn(p, true);
          const origin = { x: targetShape.p.x + targetShape.width, y: targetShape.p.y + targetShape.height / 2 };
          const value = sub(origin, adjustedP);
          const maxW = targetShape.width;
          const maxH = targetShape.height / 2;
          const nextControl = {
            x: clamp(0, 1, value.x / maxW),
            y: clamp(0, 1, value.y / maxH),
          };

          const shapeComposite = ctx.getShapeComposite();
          const patch = { headControl: nextControl } as Partial<OneSidedArrowShape>;
          // Note: Line connections don't change by this operation.
          // => Mainly because of its complexity.
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
      const tmpShape: OneSidedArrowShape = { ...targetShape, ...ctx.getTmpShapeMap()[targetShape.id] };
      const headControlP = getHeadControlPoint(tmpShape);
      applyFillStyle(renderCtx, { color: ctx.getStyleScheme().selectionSecondaly });
      renderCtx.beginPath();
      renderCtx.arc(headControlP.x, headControlP.y, 6 * ctx.getScale(), 0, TAU);
      renderCtx.fill();
    },
  };
}
