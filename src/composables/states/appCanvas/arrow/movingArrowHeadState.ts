import type { AppCanvasState } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { getRotateFn } from "../../../../utils/geometry";
import { add, clamp, sub } from "okageo";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { ArrowCommonShape, getHeadControlPoint, getHeadMaxLength } from "../../../../utils/arrows";
import { getNormalizedSimplePolygonShape } from "../../../../shapes/simplePolygon";
import { renderOutlinedCircle } from "../../../../utils/renderer";

interface Option {
  targetId: string;
}

export function newMovingArrowHeadState(option: Option): AppCanvasState {
  let targetShape: ArrowCommonShape;

  return {
    getLabel: () => "MovingArrowHead",
    onStart: (ctx) => {
      targetShape = ctx.getShapeComposite().shapeMap[option.targetId] as ArrowCommonShape;
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
          const p = add(getHeadControlPoint(normalizedTarget), diff);
          const adjustedP = rotateFn(p, true);
          const origin = {
            x: normalizedTarget.p.x + normalizedTarget.width,
            y: normalizedTarget.p.y + normalizedTarget.height / 2,
          };
          const value = sub(origin, adjustedP);
          const maxW = getHeadMaxLength(normalizedTarget);
          const maxH = normalizedTarget.height / 2;
          const nextControl = {
            x: clamp(0, 1, value.x / maxW),
            y: clamp(0, 1, value.y / maxH),
          };

          const shapeComposite = ctx.getShapeComposite();
          const patch = { headControl: nextControl } as Partial<ArrowCommonShape>;
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
      const tmpShape: ArrowCommonShape = { ...targetShape, ...ctx.getTmpShapeMap()[targetShape.id] };
      const headControlP = getHeadControlPoint(tmpShape);
      renderOutlinedCircle(renderCtx, headControlP, 6 * ctx.getScale(), ctx.getStyleScheme().selectionSecondaly);
    },
  };
}
