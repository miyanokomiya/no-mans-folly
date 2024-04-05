import { newTrapezoidHandler, renderMovingTrapezoidAnchor } from "../../../shapeHandlers/trapezoidHandler";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { movingShapeControlState } from "../movingShapeControlState";
import { TrapezoidShape } from "../../../../shapes/polygons/trapezoid";
import { add, applyAffine, clamp, getRadian, rotate } from "okageo";
import {
  getAffineByLeftExpansion,
  getAffineByRightExpansion,
  getShapeDetransform,
  getShapeTransform,
  migrateRelativePoint,
} from "../../../../shapes/simplePolygon";
import { getCrossLineAndLine, snapRadianByAngle } from "../../../../utils/geometry";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { applyPath } from "../../../../utils/renderer";

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
                          patchFn: (s, p, movement) => {
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
                          extraCommands: [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
                          patchFn: (s, p, movement) => {
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
                    case "left":
                      return () => {
                        return movingShapeControlState<TrapezoidShape>({
                          targetId: targetShape.id,
                          patchFn: (s, p) => {
                            const resized = shapeComposite.transformShape(s, getAffineByLeftExpansion(s, p));
                            return {
                              ...resized,
                              c0: migrateRelativePoint(targetShape.c0, targetShape, resized, { x: 0, y: 0 }),
                              c1: migrateRelativePoint(targetShape.c1, targetShape, resized, { x: 1, y: 0 }),
                            };
                          },
                          getControlFn: (s) =>
                            applyAffine(getShapeTransform(s), {
                              x: 0,
                              y: s.height / 2,
                            }),
                          renderFn: (ctx, renderCtx, s) => {
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
                          patchFn: (s, p) => {
                            const resized = shapeComposite.transformShape(s, getAffineByRightExpansion(s, p));
                            return {
                              ...resized,
                              c0: migrateRelativePoint(targetShape.c0, targetShape, resized, { x: 0, y: 0 }),
                              c1: migrateRelativePoint(targetShape.c1, targetShape, resized, { x: 1, y: 0 }),
                            };
                          },
                          getControlFn: (s) =>
                            applyAffine(getShapeTransform(s), {
                              x: s.width,
                              y: s.height / 2,
                            }),
                          renderFn: (ctx, renderCtx, s) => {
                            const path = shapeComposite.getLocalRectPolygon(s);
                            applyStrokeStyle(renderCtx, { color: ctx.getStyleScheme().selectionPrimary });
                            renderCtx.beginPath();
                            applyPath(renderCtx, path, true);
                            renderCtx.stroke();
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
