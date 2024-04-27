import { ArcShape } from "../../../../shapes/arc";
import { movingShapeControlState } from "../movingShapeControlState";
import { add, getRadian, rotate } from "okageo";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { renderValueLabel } from "../../../../utils/renderer";
import {
  ArcHandler,
  getArcFromLocalControl,
  getArcToLocalControl,
  newArcHandler,
} from "../../../shapeHandlers/arcHandler";
import { snapRadianByAngle } from "../../../../utils/geometry";

export const newArcSelectedState = defineSingleSelectedHandlerState<ArcShape, ArcHandler, never>(
  (getters) => {
    return {
      getLabel: () => "ArcSelected",
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
                    case "from":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<ArcShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const normalP = rotate(
                              { x: p.x - shape.p.x - shape.rx, y: p.y - shape.p.y - shape.ry },
                              -shape.rotation,
                            );
                            const adjustedP = { x: normalP.x / shape.rx, y: normalP.y / shape.ry };
                            let nextFrom = getRadian({ x: adjustedP.x, y: adjustedP.y });

                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextFrom = snapRadianByAngle(nextFrom, 1);
                              showLabel = true;
                            }
                            return { from: nextFrom };
                          },
                          getControlFn: (shape) => {
                            const c = { x: shape.rx, y: shape.ry };
                            return add(shape.p, rotate(getArcFromLocalControl(shape), shape.rotation, c));
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const scale = ctx.getScale();
                            const c = { x: shape.rx, y: shape.ry };
                            renderValueLabel(
                              renderCtx,
                              Math.round((shape.from * 180) / Math.PI),
                              add(shape.p, c),
                              0,
                              scale,
                            );
                          },
                        });
                      };
                    case "to":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<ArcShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const normalP = rotate(
                              { x: p.x - shape.p.x - shape.rx, y: p.y - shape.p.y - shape.ry },
                              -shape.rotation,
                            );
                            const adjustedP = { x: normalP.x / shape.rx, y: normalP.y / shape.ry };
                            let nextTo = getRadian({ x: adjustedP.x, y: adjustedP.y });

                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextTo = snapRadianByAngle(nextTo, 1);
                              showLabel = true;
                            }
                            return { to: nextTo };
                          },
                          getControlFn: (shape) => {
                            const c = { x: shape.rx, y: shape.ry };
                            return add(shape.p, rotate(getArcToLocalControl(shape), shape.rotation, c));
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const scale = ctx.getScale();
                            const c = { x: shape.rx, y: shape.ry };
                            renderValueLabel(
                              renderCtx,
                              Math.round((shape.to * 180) / Math.PI),
                              add(shape.p, c),
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
    newArcHandler({
      getShapeComposite: ctx.getShapeComposite,
      targetId: target.id,
    }),
);
