import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { movingShapeControlState } from "../movingShapeControlState";
import { TrapezoidShape } from "../../../../shapes/polygons/trapezoid";
import { add, applyAffine, clamp, getRadian, rotate } from "okageo";
import {
  getDirectionalLocalAbsolutePoints,
  getNormalizedSimplePolygonShape,
  getShapeDetransform,
  getShapeTransform,
} from "../../../../shapes/simplePolygon";
import { getCrossLineAndLine, snapRadianByAngle } from "../../../../utils/geometry";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { renderValueLabel } from "../../../../utils/renderer";
import {
  SimplePolygonHandler,
  getResizeByState,
  handleSwitchDirection4,
  newSimplePolygonHandler,
} from "../../../shapeHandlers/simplePolygonHandler";

export const newTrapezoidSelectedState = defineSingleSelectedHandlerState<TrapezoidShape, SimplePolygonHandler, never>(
  (getters) => {
    return {
      getLabel: () => "TrapezoidSelected",
      handleEvent: (ctx, event) => {
        switch (event.type) {
          case "pointerdown":
            switch (event.data.options.button) {
              case 0: {
                const targetShape = getters.getTargetShape();
                const shapeHandler = getters.getShapeHandler();
                const shapeComposite = ctx.getShapeComposite();

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
                          extraCommands: [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
                          patchFn: (shape, p, movement) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCX = movement.shift
                              ? clamp(0, 0.5, localP.x / s.width)
                              : clamp(0, 1, localP.x / s.width);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              const orign = { x: 0, y: targetShape.height };
                              const rad = getRadian({ x: nextCX * targetShape.width, y: 0 }, orign);
                              const snappedRad = snapRadianByAngle(rad, 1);
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
                            return movement.shift
                              ? { c0: { x: nextCX, y: 0 }, c1: { x: 1 - nextCX, y: 0 } }
                              : { c0: { x: nextCX, y: 0 } };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), { x: s.width * s.c0.x, y: 0 });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const s = getNormalizedSimplePolygonShape(shape);
                            const origin = { x: 0, y: s.height };
                            const rad = getRadian({ x: s.width * s.c0.x, y: 0 }, origin);
                            const angle = Math.round((-rad * 180) / Math.PI);
                            renderValueLabel(
                              renderCtx,
                              `${angle}°`,
                              applyAffine(getShapeTransform(s), origin),
                              0,
                              ctx.getScale(),
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
                          extraCommands: [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
                          patchFn: (shape, p, movement) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCX = movement.shift
                              ? clamp(0.5, 1, localP.x / s.width)
                              : clamp(0, 1, localP.x / s.width);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              const orign = { x: targetShape.width, y: targetShape.height };
                              const rad = getRadian({ x: nextCX * targetShape.width, y: 0 }, orign);
                              const snappedRad = snapRadianByAngle(rad, 1);
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
                            return movement.shift
                              ? { c0: { x: 1 - nextCX, y: 0 }, c1: { x: nextCX, y: 0 } }
                              : { c1: { x: nextCX, y: 0 } };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), { x: s.width * s.c1.x, y: 0 });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const s = getNormalizedSimplePolygonShape(shape);
                            const origin = { x: s.width, y: s.height };
                            const rad = getRadian({ x: s.width * s.c1.x, y: 0 }, origin);
                            const angle = 180 - Math.round((-rad * 180) / Math.PI);
                            renderValueLabel(
                              renderCtx,
                              `${angle}°`,
                              applyAffine(getShapeTransform(s), origin),
                              0,
                              ctx.getScale(),
                            );
                          },
                        });
                      };
                    case "left":
                      return () =>
                        getResizeByState(3, shapeComposite, targetShape, [
                          ["c0", { x: 0, y: 0 }],
                          ["c1", { x: 1, y: 0 }],
                        ]);
                    case "right":
                      return () =>
                        getResizeByState(1, shapeComposite, targetShape, [
                          ["c0", { x: 0, y: 0 }],
                          ["c1", { x: 1, y: 0 }],
                        ]);
                    case "direction4": {
                      return handleSwitchDirection4(ctx, targetShape);
                    }
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
        const s = getNormalizedSimplePolygonShape(target);
        const list = getDirectionalLocalAbsolutePoints(target, s, [s.c0, s.c1, { x: 0, y: 0.5 }, { x: 1, y: 0.5 }]);
        return [
          ["c0", list[0]],
          ["c1", list[1]],
          ["left", list[2]],
          ["right", list[3]],
        ];
      },
      direction4: true,
    }),
);
