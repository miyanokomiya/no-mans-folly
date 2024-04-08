import type { AppCanvasState } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { OneSidedArrowShape, getTailControlPoint } from "../../../../shapes/oneSidedArrow";
import { getRotateFn } from "../../../../utils/geometry";
import { add, clamp, sub } from "okageo";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { getNormalizedSimplePolygonShape } from "../../../../shapes/simplePolygon";
import { renderOutlinedCircle } from "../../../../utils/renderer";

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

          const normalizedTarget = getNormalizedSimplePolygonShape(targetShape);
          const rotateFn = getRotateFn(normalizedTarget.rotation, {
            x: normalizedTarget.p.x + normalizedTarget.width / 2,
            y: normalizedTarget.p.y + normalizedTarget.height / 2,
          });
          const p = add(getTailControlPoint(normalizedTarget), diff);
          const adjustedP = rotateFn(p, true);
          const origin = normalizedTarget.p.y + normalizedTarget.height / 2;
          const value = origin - adjustedP.y;
          const maxH = (normalizedTarget.height * normalizedTarget.headControl.y) / 2;
          const nextControl = {
            x: 0,
            y: clamp(0, 1, value / maxH),
          };

          const shapeComposite = ctx.getShapeComposite();
          const patch = { tailControl: nextControl } as Partial<OneSidedArrowShape>;
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
        case "shape-updated": {
          if (event.data.keys.has(targetShape.id)) return newSelectionHubState;
          return;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const tmpShape: OneSidedArrowShape = { ...targetShape, ...ctx.getTmpShapeMap()[targetShape.id] };
      const tailControlP = getTailControlPoint(tmpShape);
      renderOutlinedCircle(renderCtx, tailControlP, 6 * ctx.getScale(), ctx.getStyleScheme().selectionSecondaly);
    },
  };
}
