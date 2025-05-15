import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { movingShapeControlState } from "../movingShapeControlState";
import { GearShape, getMaxGearSize } from "../../../../shapes/polygons/gear";
import { IVec2, applyAffine, clamp, getRadian, rotate } from "okageo";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/rectPolygon";
import { getDirectionalLocalAbsolutePoints, getNormalizedSimplePolygonShape } from "../../../../shapes/simplePolygon";
import {
  EDGE_ANCHOR_MARGIN,
  SimplePolygonHandler,
  handleSwitchDirection4,
  newSimplePolygonHandler,
} from "../../../shapeHandlers/simplePolygonHandler";
import { renderValueLabel } from "../../../../utils/renderer";
import { divideSafely, TAU } from "../../../../utils/geometry";

export const newGearSelectedState = defineSingleSelectedHandlerState<GearShape, SimplePolygonHandler, never>(
  (getters) => {
    return {
      getLabel: () => "GearSelected",
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
                    case "c0":
                      return () => {
                        let showLabel = false;

                        return movingShapeControlState<GearShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            if (shape.height === 0) return { c0: shape.c0 };

                            const s = getNormalizedSimplePolygonShape(shape);
                            let localY = applyAffine(getShapeDetransform(s), p).y;

                            showLabel = !movement.ctrl;
                            if (!movement.ctrl) {
                              localY = Math.round(localY);
                            }

                            const localP = {
                              x: s.width / 2,
                              y: localY,
                            };
                            const nextCY = clamp(0, 0.5, localP.y / s.height);
                            return { c0: { x: shape.c0.x, y: nextCY } };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), {
                              x: shape.width * s.c0.x,
                              y: shape.height * s.c0.y,
                            });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const scale = ctx.getScale();
                            const s = getNormalizedSimplePolygonShape(shape);
                            const v = s.height * s.c0.y;
                            const origin = { x: s.width / 2, y: v + 10 };
                            renderValueLabel(
                              renderCtx,
                              Math.round(v),
                              applyAffine(getShapeTransform(s), origin),
                              0,
                              scale,
                            );
                          },
                        });
                      };
                    case "size":
                      return () => {
                        return movingShapeControlState<GearShape>({
                          targetId: targetShape.id,
                          snapType: "disabled",
                          patchFn: (shape, p) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            const nextRate = clamp(0, 1, localP.x / s.width);
                            return { size: Math.round(nextRate * (getMaxGearSize() - 3)) + 3 };
                          },
                          getControlFn: (shape, scale) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const rate = getSizeControlRate(s, scale);
                            return applyAffine(getShapeTransform(s), { x: s.width * rate.x, y: s.height * rate.y });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            const scale = ctx.getScale();
                            const s = getNormalizedSimplePolygonShape(shape);
                            const origin = { x: 0, y: s.height };
                            renderValueLabel(renderCtx, s.size, applyAffine(getShapeTransform(s), origin), 0, scale);
                          },
                        });
                      };
                    case "topRate":
                      return () => {
                        let showLabel = false;

                        return movingShapeControlState<GearShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            if (shape.height === 0) return { topRate: shape.topRate };

                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            const localNP = { x: localP.x, y: (localP.y * s.width) / s.height };
                            let r = (getRadian(localNP, { x: s.width / 2, y: s.width / 2 }) + Math.PI / 2) * 2;
                            r = clamp(0, TAU / s.size, r);

                            showLabel = !movement.ctrl;
                            if (!movement.ctrl) {
                              r = (Math.round((r * 180) / Math.PI) * Math.PI) / 180;
                            }

                            return { topRate: r / (TAU / shape.size) };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const rate = getTopRateControlRate(s);
                            return applyAffine(getShapeTransform(s), {
                              x: shape.width * rate.x,
                              y: shape.height * rate.y,
                            });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const scale = ctx.getScale();
                            const s = getNormalizedSimplePolygonShape(shape);
                            const v = Math.round((s.topRate * (TAU / s.size) * 180) / Math.PI);
                            const origin = { x: s.width / 2, y: s.height / 2 };
                            renderValueLabel(renderCtx, `${v}°`, applyAffine(getShapeTransform(s), origin), 0, scale);
                          },
                        });
                      };
                    case "bottomRate":
                      return () => {
                        let showLabel = false;

                        return movingShapeControlState<GearShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            if (shape.height === 0) return { bottomRate: shape.bottomRate };

                            const s = getNormalizedSimplePolygonShape(shape);
                            const unitR = TAU / s.size;
                            const localP = applyAffine(getShapeDetransform(s), p);
                            const localNP = { x: localP.x, y: (localP.y * s.width) / s.height };
                            let r = -2 * (getRadian(localNP, { x: s.width / 2, y: s.width / 2 }) - unitR + Math.PI / 2);
                            r = clamp(0, TAU / s.size, r);

                            showLabel = !movement.ctrl;
                            if (!movement.ctrl) {
                              r = (Math.round((r * 180) / Math.PI) * Math.PI) / 180;
                            }

                            return { bottomRate: r / (TAU / shape.size) };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const rate = getBottomRateControlRate(s);
                            return applyAffine(getShapeTransform(s), {
                              x: shape.width * rate.x,
                              y: shape.height * rate.y,
                            });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const scale = ctx.getScale();
                            const s = getNormalizedSimplePolygonShape(shape);
                            const v = Math.round((s.bottomRate * (TAU / s.size) * 180) / Math.PI);
                            const origin = { x: s.width / 2, y: s.height / 2 };
                            renderValueLabel(renderCtx, `${v}°`, applyAffine(getShapeTransform(s), origin), 0, scale);
                          },
                        });
                      };
                    case "cogType": {
                      ctx.updateShapes({
                        update: {
                          [targetShape.id]: {
                            cogType: targetShape.cogType !== 1 ? 1 : undefined,
                          } as Partial<GearShape>,
                        },
                      });
                      return ctx.states.newSelectionHubState;
                    }
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
      getAnchors: (scale) => {
        const s = getNormalizedSimplePolygonShape(target);
        const list = getDirectionalLocalAbsolutePoints(target, s, [
          s.c0,
          getSizeControlRate(s, scale),
          getTopRateControlRate(s),
          getBottomRateControlRate(s),
          getGearTypeControlRate(s, scale),
        ]);
        return [
          ["c0", list[0]],
          ["size", list[1]],
          ["topRate", list[2]],
          ["bottomRate", list[3]],
          ["cogType", list[4], "button"],
        ];
      },
      direction4: true,
    }),
);

function getSizeControlRate(shape: GearShape, scale: number): IVec2 {
  return {
    x: (shape.size - 3) / (getMaxGearSize() - 3),
    y: 1 + divideSafely(EDGE_ANCHOR_MARGIN, shape.height, 0) * scale,
  };
}

function getTopRateControlRate(shape: GearShape): IVec2 {
  const v = { x: 0, y: -shape.height / 2 };
  const p = rotate(v, ((TAU / shape.size) * shape.topRate) / 2);
  return {
    x: 0.5 + p.x / shape.height,
    y: 0.5 + p.y / shape.height,
  };
}

function getBottomRateControlRate(shape: GearShape): IVec2 {
  const v = { x: 0, y: -shape.height * (0.5 - shape.c0.y) };
  const unitR = TAU / shape.size;
  const p = rotate(v, unitR * (1 - shape.bottomRate / 2));
  return {
    x: 0.5 + p.x / shape.height,
    y: 0.5 + p.y / shape.height,
  };
}

function getGearTypeControlRate(shape: GearShape, scale: number): IVec2 {
  return {
    x: 1 + divideSafely(EDGE_ANCHOR_MARGIN, shape.width, 0) * scale,
    y: 1 - divideSafely(EDGE_ANCHOR_MARGIN, shape.height, 0) * scale,
  };
}
