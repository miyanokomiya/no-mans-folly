import { movingShapeControlState } from "../movingShapeControlState";
import { add, clamp, rotate } from "okageo";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { renderValueLabel } from "../../../../utils/renderer";
import { DonutShape } from "../../../../shapes/donut";
import { newDonutHandler, DonutHandler, getDonutHoleRateLocalControl } from "../../../shapeHandlers/donutHandler";

export const newDonutSelectedState = defineSingleSelectedHandlerState<DonutShape, DonutHandler, never>(
  (getters) => {
    return {
      getLabel: () => "DonutSelected",
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
                    case "holeRate":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<DonutShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const rotatedP = rotate(p, -shape.rotation, {
                              x: shape.p.x + shape.rx,
                              y: shape.p.y + shape.ry,
                            });
                            let nextSize = clamp(0, shape.ry, rotatedP.y - shape.p.y);

                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextSize = Math.round(nextSize);
                              showLabel = true;
                            }
                            return { holeRate: 1 - nextSize / shape.ry };
                          },
                          getControlFn: (shape) => {
                            const c = { x: shape.rx, y: shape.ry };
                            return add(shape.p, rotate(getDonutHoleRateLocalControl(shape), shape.rotation, c));
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const c = { x: shape.rx, y: shape.ry };
                            const donutSize = shape.ry * (1 - shape.holeRate);
                            const scale = ctx.getScale();
                            renderValueLabel(
                              renderCtx,
                              Math.round(donutSize),
                              add(shape.p, rotate(getDonutHoleRateLocalControl(shape), shape.rotation, c)),
                              0,
                              scale,
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
    newDonutHandler({
      getShapeComposite: ctx.getShapeComposite,
      targetId: target.id,
    }),
);
