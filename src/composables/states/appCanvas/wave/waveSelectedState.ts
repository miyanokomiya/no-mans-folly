import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { movingShapeControlState } from "../movingShapeControlState";
import { WaveShape } from "../../../../shapes/polygons/wave";
import { IVec2, applyAffine, clamp } from "okageo";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/simplePolygon";
import { renderValueLabel } from "../../../../utils/renderer";
import { SimplePolygonHandler, newSimplePolygonHandler } from "../../../shapeHandlers/simplePolygonHandler";

export const newWaveSelectedState = defineSingleSelectedHandlerState<WaveShape, SimplePolygonHandler, never>(
  (getters) => {
    return {
      getLabel: () => "WaveSelected",
      handleEvent: (ctx, event) => {
        switch (event.type) {
          case "pointerdown":
            switch (event.data.options.button) {
              case 0: {
                const targetShape = getters.getTargetShape();
                const shapeHandler = getters.getShapeHandler();

                const hitResult = shapeHandler.hitTest(event.data.point, ctx.getScale());
                shapeHandler.saveHitResult(hitResult);
                if (hitResult) {
                  switch (hitResult.type) {
                    case "waveSize":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<WaveShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const localP = applyAffine(getShapeDetransform(shape), p);
                            let nextValue = clamp(10, shape.width, localP.x);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextValue = Math.round(nextValue);
                              showLabel = true;
                            }
                            return { waveSize: nextValue };
                          },
                          getControlFn: (shape) => {
                            return applyAffine(getShapeTransform(shape), getSizeControl(shape));
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            renderValueLabel(
                              renderCtx,
                              shape.waveSize,
                              applyAffine(getShapeTransform(shape), getSizeControl(shape)),
                              0,
                              ctx.getScale(),
                            );
                          },
                        });
                      };
                    case "waveDepth":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<WaveShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const localP = applyAffine(getShapeDetransform(shape), p);
                            let nextValue = clamp(0, shape.height, localP.y);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextValue = Math.round(nextValue);
                              showLabel = true;
                            }
                            return { waveDepth: nextValue };
                          },
                          getControlFn: (shape) => {
                            return applyAffine(getShapeTransform(shape), getDepthControl(shape));
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            renderValueLabel(
                              renderCtx,
                              shape.waveDepth,
                              applyAffine(getShapeTransform(shape), getDepthControl(shape)),
                              0,
                              ctx.getScale(),
                            );
                          },
                        });
                      };
                  }
                }
              }
            }
        }
      },
    };
  },
  (ctx, target) =>
    newSimplePolygonHandler({
      getShapeComposite: ctx.getShapeComposite,
      targetId: target.id,
      getAnchors: () => {
        return [
          ["waveSize", getSizeControl(target)],
          ["waveDepth", getDepthControl(target)],
        ];
      },
    }),
);

function getSizeControl(shape: WaveShape): IVec2 {
  return { x: shape.waveSize, y: shape.height / 4 };
}

function getDepthControl(shape: WaveShape): IVec2 {
  return { x: shape.waveSize / 4, y: shape.waveDepth };
}
