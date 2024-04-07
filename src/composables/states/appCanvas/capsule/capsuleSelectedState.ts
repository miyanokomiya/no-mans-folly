import { CapsuleShape } from "../../../../shapes/polygons/capsule";
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
import { applyAffine, clamp } from "okageo";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { renderValueLabel } from "../../../../utils/renderer";
import {
  EDGE_ANCHOR_MARGIN,
  SimplePolygonHandler,
  newSimplePolygonHandler,
  renderShapeBounds,
} from "../../../shapeHandlers/simplePolygonHandler";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { newSelectionHubState } from "../selectionHubState";

export const newCapsuleSelectedState = defineSingleSelectedHandlerState<CapsuleShape, SimplePolygonHandler, never>(
  (getters) => {
    return {
      getLabel: () => "CapsuleSelected",
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
                    case "c0x":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<CapsuleShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCX = clamp(0, 0.5, localP.x / s.width);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextCX = Math.round(nextCX * s.width) / s.width;
                              showLabel = true;
                            }
                            return { c0: { x: nextCX, y: s.c0.y } };
                          },
                          getControlFn: (shape, scale) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), {
                              x: s.width * s.c0.x,
                              y: -EDGE_ANCHOR_MARGIN * scale,
                            });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const s = getNormalizedSimplePolygonShape(shape);
                            renderValueLabel(
                              renderCtx,
                              Math.round(s.c0.x * s.width),
                              applyAffine(getShapeTransform(s), { x: s.c0.x * s.width, y: 0 }),
                              0,
                              ctx.getScale(),
                            );
                          },
                        });
                      };
                    case "c1x":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<CapsuleShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCX = clamp(0.5, 1, localP.x / s.width);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextCX = Math.round(nextCX * s.width) / s.width;
                              showLabel = true;
                            }
                            return { c1: { x: nextCX, y: s.c1.y } };
                          },
                          getControlFn: (shape, scale) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), {
                              x: s.width * s.c1.x,
                              y: -EDGE_ANCHOR_MARGIN * scale,
                            });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const s = getNormalizedSimplePolygonShape(shape);
                            renderValueLabel(
                              renderCtx,
                              Math.round((1 - s.c1.x) * s.width),
                              applyAffine(getShapeTransform(s), { x: s.c1.x * s.width, y: 0 }),
                              0,
                              ctx.getScale(),
                            );
                          },
                        });
                      };
                    case "c0y":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<CapsuleShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCY = clamp(0, 0.5, localP.y / s.height);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextCY = Math.round(nextCY * s.height) / s.height;
                              showLabel = true;
                            }
                            return { c0: { x: s.c0.x, y: nextCY } };
                          },
                          getControlFn: (shape, scale) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), {
                              x: -EDGE_ANCHOR_MARGIN * scale,
                              y: s.height * s.c0.y,
                            });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const s = getNormalizedSimplePolygonShape(shape);
                            renderValueLabel(
                              renderCtx,
                              Math.round(s.c0.y * s.height),
                              applyAffine(getShapeTransform(s), { x: 0, y: s.c0.y * s.height }),
                              0,
                              ctx.getScale(),
                            );
                          },
                        });
                      };
                    case "c1y":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<CapsuleShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCY = clamp(0, 0.5, localP.y / s.height);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextCY = Math.round(nextCY * s.height) / s.height;
                              showLabel = true;
                            }
                            return { c1: { x: s.c1.x, y: nextCY } };
                          },
                          getControlFn: (shape, scale) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), {
                              x: s.width + EDGE_ANCHOR_MARGIN * scale,
                              y: s.height * s.c1.y,
                            });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const s = getNormalizedSimplePolygonShape(shape);
                            renderValueLabel(
                              renderCtx,
                              Math.round(s.c1.y * s.height),
                              applyAffine(getShapeTransform(s), { x: s.width, y: s.c1.y * s.height }),
                              0,
                              ctx.getScale(),
                            );
                          },
                        });
                      };
                    case "left":
                      return () => {
                        return movingShapeControlState<CapsuleShape>({
                          targetId: targetShape.id,
                          patchFn: (shape, p) => {
                            const resized = shapeComposite.transformShape(shape, getExpansionFn(shape, 3)(shape, p));
                            const migrateFn = getMigrateRelativePointFn(shape, resized);
                            return {
                              ...resized,
                              c0: migrateFn(targetShape.c0, { x: 0, y: 0 }),
                              c1: migrateFn(targetShape.c1, { x: 1, y: 0 }),
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
                        return movingShapeControlState<CapsuleShape>({
                          targetId: targetShape.id,
                          patchFn: (shape, p) => {
                            const resized = shapeComposite.transformShape(shape, getExpansionFn(shape, 1)(shape, p));
                            const migrateFn = getMigrateRelativePointFn(shape, resized);
                            return {
                              ...resized,
                              c0: migrateFn(targetShape.c0, { x: 0, y: 0 }),
                              c1: migrateFn(targetShape.c1, { x: 1, y: 0 }),
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
      getAnchors: (scale) => {
        const s = getNormalizedSimplePolygonShape(target);
        const list = getDirectionalLocalAbsolutePoints(target, s, [
          { x: s.c0.x, y: (-EDGE_ANCHOR_MARGIN / s.height) * scale },
          { x: s.c1.x, y: (-EDGE_ANCHOR_MARGIN / s.height) * scale },
          { x: (-EDGE_ANCHOR_MARGIN / s.width) * scale, y: s.c0.y },
          { x: 1 + (EDGE_ANCHOR_MARGIN / s.width) * scale, y: s.c1.y },
          { x: 0, y: 0.5 },
          { x: 1, y: 0.5 },
        ]);
        return [
          ["c0x", list[0]],
          ["c1x", list[1]],
          ["c0y", list[2]],
          ["c1y", list[3]],
          ["left", list[4]],
          ["right", list[5]],
        ];
      },
      direction4: true,
    }),
);
