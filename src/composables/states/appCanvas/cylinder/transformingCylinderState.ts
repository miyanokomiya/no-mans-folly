import type { AppCanvasState } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { AffineMatrix, IVec2, add, applyAffine, clamp, sub } from "okageo";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { CylinderShape } from "../../../../shapes/polygons/cylinder";
import { renderMovingCylinderAnchor } from "../../../shapeHandlers/cylinderHandler";
import { renderValueLabel } from "../../../../utils/renderer";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/simplePolygon";

interface Option {
  targetId: string;
}

export function newTransformingCylinderState(option: Option): AppCanvasState {
  let targetShape: CylinderShape;
  let srcControlP: IVec2;
  let transform: AffineMatrix;
  let detransform: AffineMatrix;
  let snappedValue: number | undefined;

  return {
    getLabel: () => "TransformingCylinder",
    onStart: (ctx) => {
      targetShape = ctx.getShapeComposite().shapeMap[option.targetId] as CylinderShape;
      if (!targetShape) return newSelectionHubState;

      transform = getShapeTransform(targetShape);
      detransform = getShapeDetransform(targetShape);
      srcControlP = {
        x: targetShape.width * targetShape.c0.x,
        y: targetShape.height * targetShape.c0.y,
      };

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
          if (targetShape.height === 0) return;

          const diff = sub(applyAffine(detransform, event.data.current), applyAffine(detransform, event.data.start));

          const { height } = targetShape;
          const nextControlP = add(diff, srcControlP);
          let nextControl = { x: 0.5, y: clamp(-1, 1, nextControlP.y / height) };

          if (event.data.ctrl) {
            snappedValue = undefined;
          } else {
            const ry = height * nextControl.y;
            const snapped = Math.round(ry);
            const rate = snapped / ry;
            nextControl = { x: 0.5, y: clamp(-1, 1, nextControl.y * rate) };
            snappedValue = Math.round(height * nextControl.y);
          }

          const shapeComposite = ctx.getShapeComposite();
          const patch = { c0: nextControl } as Partial<CylinderShape>;
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
      const tmpShape: CylinderShape = { ...targetShape, ...ctx.getTmpShapeMap()[targetShape.id] };
      renderMovingCylinderAnchor(renderCtx, ctx.getStyleScheme(), ctx.getScale(), tmpShape);

      if (snappedValue !== undefined) {
        renderValueLabel(
          renderCtx,
          snappedValue,
          applyAffine(transform, { x: targetShape.width / 2, y: 0 }),
          0,
          ctx.getScale(),
        );
      }
    },
  };
}
