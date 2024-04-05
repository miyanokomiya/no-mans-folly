import { ParallelogramShape } from "../../../../shapes/polygons/parallelogram";
import { movingShapeControlState } from "../movingShapeControlState";
import {
  SimplePolygonShape,
  getDirectionalLocalAbsolutePoints,
  getExpansionFn,
  getMigrateRelativePointFn,
  getNextDirection2,
  getNormalizedSimplePolygonShape,
  getShapeDetransform,
  getShapeDirection,
  getShapeTransform,
} from "../../../../shapes/simplePolygon";
import { add, applyAffine, clamp, getRadian, rotate } from "okageo";
import { getCrossLineAndLine, snapAngle } from "../../../../utils/geometry";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { renderValueLabel } from "../../../../utils/renderer";
import {
  SimplePolygonHandler,
  newSimplePolygonHandler,
  renderShapeBounds,
} from "../../../shapeHandlers/simplePolygonHandler";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { newSelectionHubState } from "../selectionHubState";

export const newParallelogramSelectedState = defineSingleSelectedHandlerState<
  ParallelogramShape,
  SimplePolygonHandler,
  never
>(
  (getters) => {
    return {
      getLabel: () => "ParallelogramSelected",
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
                        return movingShapeControlState<ParallelogramShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCX = clamp(0, 1, localP.x / s.width);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              const orign = { x: targetShape.width / 2, y: targetShape.height };
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
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), { x: s.width * s.c0.x, y: 0 });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const s = getNormalizedSimplePolygonShape(shape);
                            const origin = { x: s.width / 2, y: s.height };
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
                    case "left":
                      return () => {
                        return movingShapeControlState<ParallelogramShape>({
                          targetId: targetShape.id,
                          patchFn: (shape, p) => {
                            const resized = shapeComposite.transformShape(shape, getExpansionFn(shape, 3)(shape, p));
                            const migrateFn = getMigrateRelativePointFn(shape, resized);
                            return {
                              ...resized,
                              c0: migrateFn(targetShape.c0, { x: 0.5, y: 0 }),
                            };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), { x: 0, y: s.height / 2 });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            renderShapeBounds(
                              renderCtx,
                              ctx.getStyleScheme(),
                              shapeComposite.getLocalRectPolygon(shape),
                            );
                          },
                        });
                      };
                    case "right":
                      return () => {
                        return movingShapeControlState<ParallelogramShape>({
                          targetId: targetShape.id,
                          patchFn: (shape, p) => {
                            const resized = shapeComposite.transformShape(shape, getExpansionFn(shape, 1)(shape, p));
                            const migrateFn = getMigrateRelativePointFn(shape, resized);
                            return {
                              ...resized,
                              c0: migrateFn(targetShape.c0, { x: 0.5, y: 0 }),
                            };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), { x: s.width, y: s.height / 2 });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            renderShapeBounds(
                              renderCtx,
                              ctx.getStyleScheme(),
                              shapeComposite.getLocalRectPolygon(shape),
                            );
                          },
                        });
                      };
                    case "direction4": {
                      const patch = {
                        direction: getNextDirection2(getShapeDirection(targetShape)),
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
        const list = getDirectionalLocalAbsolutePoints(target, s, [s.c0, { x: 0, y: 0.5 }, { x: 1, y: 0.5 }]);
        return [
          ["c0", list[0]],
          ["left", list[1]],
          ["right", list[2]],
        ];
      },
      direction4: true,
    }),
);
