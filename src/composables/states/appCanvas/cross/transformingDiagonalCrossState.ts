import type { AppCanvasState } from "../core";
import { getRotateFn } from "../../../../utils/geometry";
import { IVec2, add, clamp, sub } from "okageo";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { DiagonalCrossShape } from "../../../../shapes/polygons/diagonalCross";
import { renderMovingCrossAnchor } from "../../../shapeHandlers/crossHandler";
import { renderValueLabel } from "../../../../utils/renderer";
import { COMMAND_EXAM_SRC } from "../commandExams";

interface Option {
  targetId: string;
}

export function newTransformingDiagonalCrossState(option: Option): AppCanvasState {
  let targetShape: DiagonalCrossShape;
  let srcControlP: IVec2;
  let rotateFn: ReturnType<typeof getRotateFn>;
  let snappedAngle: number | undefined;

  return {
    getLabel: () => "TransformingDiagonalCross",
    onStart: (ctx) => {
      targetShape = ctx.getShapeComposite().shapeMap[option.targetId] as DiagonalCrossShape;
      if (!targetShape) return ctx.states.newSelectionHubState;

      rotateFn = getRotateFn(targetShape.rotation, {
        x: targetShape.p.x + targetShape.width / 2,
        y: targetShape.p.y + targetShape.height / 2,
      });
      srcControlP = rotateFn({
        x: targetShape.p.x + targetShape.width / 2 + targetShape.crossSize / 2,
        y: targetShape.p.y,
      });

      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_SNAP]);
      ctx.startDragging();
    },
    onEnd: (ctx) => {
      ctx.setTmpShapeMap({});
      ctx.setCommandExams();
      ctx.stopDragging();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          if (targetShape.width === 0) return;

          const diff = sub(event.data.current, event.data.start);

          const { width, height } = targetShape;
          const nextControlP = rotateFn(add(diff, srcControlP), true);
          const nextSize =
            clamp(1, Math.min(width / 2, height / 2), nextControlP.x - (targetShape.p.x + width / 2)) * 2;

          const shapeComposite = ctx.getShapeComposite();
          const patch = { crossSize: nextSize } as Partial<DiagonalCrossShape>;
          const layoutPatch = getPatchByLayouts(shapeComposite, {
            update: { [targetShape.id]: patch },
          });
          ctx.setTmpShapeMap(layoutPatch);
          return;
        }
        case "pointerup": {
          ctx.patchShapes(ctx.getTmpShapeMap());
          return ctx.states.newSelectionHubState;
        }
        case "shape-updated": {
          if (event.data.keys.has(targetShape.id)) return ctx.states.newSelectionHubState;
          return;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const tmpShape: DiagonalCrossShape = { ...targetShape, ...ctx.getTmpShapeMap()[targetShape.id] };
      renderMovingCrossAnchor(renderCtx, ctx.getStyleScheme(), ctx.getScale(), tmpShape);

      if (snappedAngle !== undefined) {
        renderValueLabel(
          renderCtx,
          snappedAngle,
          rotateFn({ x: targetShape.p.x + targetShape.width / 2, y: targetShape.p.y + targetShape.height / 2 }),
          0,
          ctx.getScale(),
        );
      }
    },
  };
}
