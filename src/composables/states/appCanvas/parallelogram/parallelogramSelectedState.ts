import { ParallelogramShape, getMaxParallelogramCornerRadius } from "../../../../shapes/polygons/parallelogram";
import { movingShapeControlState } from "../movingShapeControlState";
import {
  getDirectionalLocalAbsolutePoints,
  getNormalizedSimplePolygonShape,
  getShapeDetransform,
  getShapeTransform,
} from "../../../../shapes/simplePolygon";
import { add, applyAffine, clamp, getRadian, rotate } from "okageo";
import { getCrossLineAndLine, snapAngle } from "../../../../utils/geometry";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { renderValueLabel } from "../../../../utils/renderer";
import {
  EDGE_ANCHOR_MARGIN,
  SimplePolygonHandler,
  getResizeByState,
  handleSwitchDirection2,
  newSimplePolygonHandler,
} from "../../../shapeHandlers/simplePolygonHandler";

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
                              `${angle}°`,
                              applyAffine(getShapeTransform(s), { x: 0, y: s.height }),
                              0,
                              ctx.getScale(),
                            );
                          },
                        });
                      };
                    case "cr":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<ParallelogramShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            const originXRate = getCrControlOriginXRate(s);
                            let nextCX = clamp(0, getMaxParallelogramCornerRadius(s), localP.x - originXRate * s.width);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextCX = Math.round(nextCX);
                              showLabel = true;
                            }
                            return { cr: nextCX };
                          },
                          getControlFn: (shape, scale) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const rateX = getCrControlXRate(s);
                            const rateY = getCrControlYRate(s, scale);
                            return applyAffine(getShapeTransform(s), { x: s.width * rateX, y: s.height * rateY });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const scale = ctx.getScale();
                            const s = getNormalizedSimplePolygonShape(shape);
                            const rateX = getCrControlXRate(s);
                            const rateY = getCrControlYRate(s, scale);
                            const origin = { x: s.width * rateX, y: s.height * rateY };
                            renderValueLabel(
                              renderCtx,
                              Math.round(s.cr ?? 0),
                              applyAffine(getShapeTransform(s), origin),
                              0,
                              scale,
                            );
                          },
                        });
                      };
                    case "left":
                      return () => getResizeByState(3, shapeComposite, targetShape, [["c0", { x: 0.5, y: 0 }]]);
                    case "right":
                      return () => getResizeByState(1, shapeComposite, targetShape, [["c0", { x: 0.5, y: 0 }]]);
                    case "direction4": {
                      return handleSwitchDirection2(ctx, targetShape);
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
          { x: getCrControlXRate(s), y: (-EDGE_ANCHOR_MARGIN / s.height) * scale },
          { x: 0, y: 0.5 },
          { x: 1, y: 0.5 },
        ]);
        return [
          ["c0", list[0]],
          ["cr", list[1]],
          ["left", list[2]],
          ["right", list[3]],
        ];
      },
      direction4: true,
    }),
);

function getCrControlYRate(shape: ParallelogramShape, scale: number) {
  return (-EDGE_ANCHOR_MARGIN / shape.height) * scale;
}

function getCrControlXRate(shape: ParallelogramShape) {
  return getCrControlOriginXRate(shape) + (shape.cr ?? 0) / shape.width;
}

function getCrControlOriginXRate(shape: ParallelogramShape) {
  return Math.max(0, shape.c0.x - 0.5);
}
