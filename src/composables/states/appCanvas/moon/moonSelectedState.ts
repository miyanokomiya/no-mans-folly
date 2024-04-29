import { MoonShape } from "../../../../shapes/moon";
import { movingShapeControlState } from "../movingShapeControlState";
import { add, clamp, rotate } from "okageo";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { renderValueLabel } from "../../../../utils/renderer";
import { MoonHandler, getMoonInnsetLocalControl, newMoonHandler } from "../../../shapeHandlers/moonHandler";

export const newMoonSelectedState = defineSingleSelectedHandlerState<MoonShape, MoonHandler, never>(
  (getters) => {
    return {
      getLabel: () => "MoonSelected",
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
                    case "innsetC":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<MoonShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const rotatedP = rotate(p, -shape.rotation, {
                              x: shape.p.x + shape.rx,
                              y: shape.p.y + shape.ry,
                            });
                            let nextSize = clamp(0, shape.rx * 2, rotatedP.x - shape.p.x);

                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextSize = Math.round(nextSize);
                              showLabel = true;
                            }
                            return { innsetC: { x: nextSize / (2 * shape.rx), y: shape.innsetC.y } };
                          },
                          getControlFn: (shape) => {
                            const c = { x: shape.rx, y: shape.ry };
                            return add(shape.p, rotate(getMoonInnsetLocalControl(shape), shape.rotation, c));
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const c = { x: shape.rx, y: shape.ry };
                            const localP = getMoonInnsetLocalControl(shape);
                            const p = add(shape.p, rotate(localP, shape.rotation, c));
                            const scale = ctx.getScale();
                            renderValueLabel(renderCtx, Math.round(localP.x), p, 0, scale);
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
    newMoonHandler({
      getShapeComposite: ctx.getShapeComposite,
      targetId: target.id,
    }),
);
