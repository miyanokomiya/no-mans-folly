import { movingShapeControlState } from "../movingShapeControlState";
import { add, clamp, rotate } from "okageo";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { renderValueLabel } from "../../../../utils/renderer";
import { DonutShape, getDonutSize } from "../../../../shapes/donut";
import { newDonutHandler, DonutHandler, getDonutSizeLocalControl } from "../../../shapeHandlers/donutHandler";

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
                    case "donutSize":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<DonutShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const c = { x: shape.p.x + shape.rx, y: shape.p.y + shape.ry };
                            const rotatedP = rotate(p, -shape.rotation, c);
                            let next = clamp(0, Math.min(shape.rx, shape.ry), rotatedP.y - shape.p.y);

                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              next = Math.round(next);
                              showLabel = true;
                            }
                            return { donutSize: next };
                          },
                          getControlFn: (shape) => {
                            const c = { x: shape.rx, y: shape.ry };
                            return add(shape.p, rotate(getDonutSizeLocalControl(shape), shape.rotation, c));
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const c = { x: shape.rx, y: shape.ry };
                            const donutSize = getDonutSize(shape);
                            const scale = ctx.getScale();
                            renderValueLabel(
                              renderCtx,
                              Math.round(donutSize),
                              add(shape.p, rotate(getDonutSizeLocalControl(shape), shape.rotation, c)),
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
