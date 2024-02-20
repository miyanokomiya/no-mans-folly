import type { AppCanvasState } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { getRotateFn } from "../../../../utils/geometry";
import { IVec2, add, sub } from "okageo";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { TrapezoidShape } from "../../../../shapes/polygons/trapezoid";
import { renderMovingTrapezoidAnchor } from "../../../shapeHandlers/trapezoidHandler";

interface Option {
  targetId: string;
  controlKey: "c0" | "c1";
}

export function newTransformingTrapezoidState(option: Option): AppCanvasState {
  let targetShape: TrapezoidShape;
  let srcControlP: IVec2;
  let rotateFn: ReturnType<typeof getRotateFn>;

  return {
    getLabel: () => "TransformingTrapezoid",
    onStart: (ctx) => {
      targetShape = ctx.getShapeComposite().shapeMap[option.targetId] as TrapezoidShape;
      if (!targetShape) return newSelectionHubState;

      rotateFn = getRotateFn(targetShape.rotation, {
        x: targetShape.p.x + targetShape.width / 2,
        y: targetShape.p.y + targetShape.height / 2,
      });
      srcControlP = rotateFn({
        x: targetShape.p.x + targetShape.width * targetShape[option.controlKey].x,
        y: targetShape.p.y,
      });
      ctx.startDragging();
    },
    onEnd: (ctx) => {
      ctx.setTmpShapeMap({});
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          if (targetShape.width === 0) return;

          const diff = sub(event.data.current, event.data.start);

          const nextControlP = rotateFn(add(diff, srcControlP), true);
          const nextControl = { x: (nextControlP.x - targetShape.p.x) / targetShape.width, y: 0 };

          const shapeComposite = ctx.getShapeComposite();
          const patch = { [option.controlKey]: nextControl } as Partial<TrapezoidShape>;
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
      const tmpShape: TrapezoidShape = { ...targetShape, ...ctx.getTmpShapeMap()[targetShape.id] };
      renderMovingTrapezoidAnchor(renderCtx, ctx.getStyleScheme(), ctx.getScale(), tmpShape, option.controlKey);
    },
  };
}
