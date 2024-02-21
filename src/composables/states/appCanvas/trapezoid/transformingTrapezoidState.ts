import type { AppCanvasState } from "../core";
import { newSelectionHubState } from "../selectionHubState";
import { getCrossLineAndLine, getRotateFn, snapAngle } from "../../../../utils/geometry";
import { IVec2, add, getRadian, rotate, sub } from "okageo";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { TrapezoidShape } from "../../../../shapes/polygons/trapezoid";
import { renderMovingTrapezoidAnchor } from "../../../shapeHandlers/trapezoidHandler";
import { renderValueLabel } from "../../../../utils/renderer";

interface Option {
  targetId: string;
  controlKey: "c0" | "c1";
}

export function newTransformingTrapezoidState(option: Option): AppCanvasState {
  let targetShape: TrapezoidShape;
  let srcControlP: IVec2;
  let rotateFn: ReturnType<typeof getRotateFn>;
  let snappedAngle: number | undefined;

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

          const { width, height } = targetShape;
          const nextControlP = rotateFn(add(diff, srcControlP), true);
          let nextControl = { x: (nextControlP.x - targetShape.p.x) / width, y: 0 };

          if (event.data.ctrl) {
            snappedAngle = undefined;
          } else {
            const rad =
              option.controlKey === "c0"
                ? -getRadian(nextControlP, { x: targetShape.p.x, y: targetShape.p.y + height })
                : getRadian(nextControlP, {
                    x: targetShape.p.x + width,
                    y: targetShape.p.y + height,
                  }) + Math.PI;
            snappedAngle = snapAngle((rad * 180) / Math.PI, 1);
            const snappedRad = (snappedAngle / 180) * Math.PI;
            const snappedControlRelativeP = getCrossLineAndLine(
              [
                { x: 0, y: 0 },
                { x: width, y: 0 },
              ],
              option.controlKey === "c0"
                ? [{ x: 0, y: height }, rotate({ x: 1, y: height }, -snappedRad, { x: 0, y: height })]
                : [{ x: width, y: height }, rotate({ x: -1, y: height }, snappedRad, { x: width, y: height })],
            );
            if (snappedControlRelativeP) {
              nextControl = { x: snappedControlRelativeP.x / width, y: snappedControlRelativeP.y / height };
            }
          }

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

      if (snappedAngle !== undefined) {
        renderValueLabel(
          renderCtx,
          snappedAngle,
          rotateFn(
            option.controlKey === "c0"
              ? { x: targetShape.p.x, y: targetShape.p.y + targetShape.height }
              : { x: targetShape.p.x + targetShape.width, y: targetShape.p.y + targetShape.height },
          ),
          0,
          ctx.getScale(),
        );
      }
    },
  };
}
