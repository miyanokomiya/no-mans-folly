import { newTrapezoidHandler, renderMovingTrapezoidAnchor } from "../../../shapeHandlers/trapezoidHandler";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { movingShapeControlState } from "../movingShapeControlState";
import { TrapezoidShape } from "../../../../shapes/polygons/trapezoid";
import { add, applyAffine, clamp, getRadian, rotate } from "okageo";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/simplePolygon";
import { getCrossLineAndLine, snapAngle } from "../../../../utils/geometry";

export const newTrapezoidSelectedState = defineSingleSelectedHandlerState<
  TrapezoidShape,
  ReturnType<typeof newTrapezoidHandler>,
  never
>(
  (getters) => {
    return {
      getLabel: () => "TrapezoidSelected",
      handleEvent: (ctx, event) => {
        switch (event.type) {
          case "pointerdown":
            ctx.setContextMenuList();

            switch (event.data.options.button) {
              case 0: {
                const targetShape = getters.getTargetShape();
                const shapeHandler = getters.getShapeHandler();
                const hitResult = shapeHandler.hitTest(event.data.point, ctx.getScale());
                shapeHandler.saveHitResult(hitResult);
                if (hitResult) {
                  switch (hitResult.type) {
                    case "c0":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<TrapezoidShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (s, p, movement) => {
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCX = clamp(0, 1, localP.x / s.width);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              const orign = { x: 0, y: targetShape.height };
                              const rad = getRadian({ x: nextCX * targetShape.width, y: 0 }, orign);
                              const snappedRad = (snapAngle((rad * 180) / Math.PI, 1) * Math.PI) / 180;
                              const snappedC = getCrossLineAndLine(
                                [
                                  { x: 0, y: 0 },
                                  { x: targetShape.width, y: 0 },
                                ],
                                [orign, add(orign, rotate({ x: 1, y: 0 }, snappedRad))],
                              );
                              if (snappedC) {
                                nextCX = clamp(0, 1, snappedC.x / targetShape.width);
                                showLabel = true;
                              }
                            }
                            return { c0: { x: nextCX, y: 0 } };
                          },
                          getControlFn: (s) =>
                            applyAffine(getShapeTransform(s), {
                              x: s.width * s.c0.x,
                              y: 0,
                            }),
                          renderFn: (ctx, renderCtx, s) => {
                            renderMovingTrapezoidAnchor(
                              renderCtx,
                              ctx.getStyleScheme(),
                              ctx.getScale(),
                              s,
                              "c0",
                              showLabel,
                            );
                          },
                        });
                      };
                    case "c1":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<TrapezoidShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (s, p, movement) => {
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCX = clamp(0, 1, localP.x / s.width);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              const orign = { x: targetShape.width, y: targetShape.height };
                              const rad = getRadian({ x: nextCX * targetShape.width, y: 0 }, orign);
                              const snappedRad = (snapAngle((rad * 180) / Math.PI, 1) * Math.PI) / 180;
                              const snappedC = getCrossLineAndLine(
                                [
                                  { x: 0, y: 0 },
                                  { x: targetShape.width, y: 0 },
                                ],
                                [orign, add(orign, rotate({ x: 1, y: 0 }, snappedRad))],
                              );
                              if (snappedC) {
                                nextCX = clamp(0, 1, snappedC.x / targetShape.width);
                                showLabel = true;
                              }
                            }
                            return { c1: { x: nextCX, y: 0 } };
                          },
                          getControlFn: (s) =>
                            applyAffine(getShapeTransform(s), {
                              x: s.width * s.c1.x,
                              y: 0,
                            }),
                          renderFn: (ctx, renderCtx, s) => {
                            renderMovingTrapezoidAnchor(
                              renderCtx,
                              ctx.getStyleScheme(),
                              ctx.getScale(),
                              s,
                              "c1",
                              showLabel,
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
  (ctx, target) => newTrapezoidHandler({ getShapeComposite: ctx.getShapeComposite, targetId: target.id }),
);
