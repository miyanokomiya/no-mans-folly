import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { movingShapeControlState } from "../movingShapeControlState";
import { TrapezoidShape } from "../../../../shapes/polygons/trapezoid";
import { add, applyAffine, clamp, getRadian, rotate } from "okageo";
import {
  SimplePolygonShape,
  getDirectionalLocalAbsolutePoints,
  getExpansionFn,
  getMigrateRelativePointFn,
  getNormalizedSimplePolygonShape,
  getShapeDetransform,
  getShapeTransform,
} from "../../../../shapes/simplePolygon";
import { getCrossLineAndLine, snapRadianByAngle } from "../../../../utils/geometry";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { applyPath, renderValueLabel } from "../../../../utils/renderer";
import { SimplePolygonHandler, newSimplePolygonHandler } from "../../../shapeHandlers/simplePolygonHandler";
import { newSelectionHubState } from "../selectionHubState";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";

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
                              angle,
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
                              angle,
                              applyAffine(getShapeTransform(s), origin),
                              0,
                              ctx.getScale(),
                            );
                          },
                        });
                      };
                    case "left":
                      return () => {
                        return movingShapeControlState<TrapezoidShape>({
                          targetId: targetShape.id,
                          patchFn: (shape, p) => {
                            const resized = shapeComposite.transformShape(shape, getExpansionFn(shape, 3)(shape, p));
                            const migrateFn = getMigrateRelativePointFn(shape, resized);
                            return {
                              ...resized,
                              c0: migrateFn(shape.c0, { x: 0, y: 0 }),
                              c1: migrateFn(shape.c1, { x: 1, y: 0 }),
                            };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), { x: 0, y: s.height / 2 });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const path = shapeComposite.getLocalRectPolygon(s);
                            applyStrokeStyle(renderCtx, { color: ctx.getStyleScheme().selectionPrimary });
                            renderCtx.beginPath();
                            applyPath(renderCtx, path, true);
                            renderCtx.stroke();
                          },
                        });
                      };
                    case "right":
                      return () => {
                        return movingShapeControlState<TrapezoidShape>({
                          targetId: targetShape.id,
                          patchFn: (shape, p) => {
                            const resized = shapeComposite.transformShape(shape, getExpansionFn(shape, 1)(shape, p));
                            const migrateFn = getMigrateRelativePointFn(shape, resized);
                            return {
                              ...resized,
                              c0: migrateFn(shape.c0, { x: 0, y: 0 }),
                              c1: migrateFn(shape.c1, { x: 1, y: 0 }),
                            };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), { x: s.width, y: s.height / 2 });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const path = shapeComposite.getLocalRectPolygon(s);
                            applyStrokeStyle(renderCtx, { color: ctx.getStyleScheme().selectionPrimary });
                            renderCtx.beginPath();
                            applyPath(renderCtx, path, true);
                            renderCtx.stroke();
                          },
                        });
                      };
                    case "direction4": {
                      const patch = {
                        direction: ((targetShape.direction ?? 1) + 1) % 4,
                      } as Partial<SimplePolygonShape>;
                      const layoutPatch = getPatchByLayouts(shapeComposite, {
                        update: { [targetShape.id]: patch },
                      });
                      ctx.patchShapes(layoutPatch);
                      return newSelectionHubState;
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
