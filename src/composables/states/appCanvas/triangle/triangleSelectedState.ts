import { TriangleShape, getDefaultTriangleTopC, getTriangleCornerMaxSize } from "../../../../shapes/polygons/triangle";
import { movingShapeControlState } from "../movingShapeControlState";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/rectPolygon";
import { getDirectionalLocalAbsolutePoints, getNormalizedSimplePolygonShape } from "../../../../shapes/simplePolygon";
import { applyAffine, clamp } from "okageo";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { renderValueLabel } from "../../../../utils/renderer";
import {
  EDGE_ANCHOR_MARGIN,
  SimplePolygonHandler,
  handleSwitchDirection4,
  newSimplePolygonHandler,
} from "../../../shapeHandlers/simplePolygonHandler";
import { divideSafely } from "../../../../utils/geometry";

export const newTriangleSelectedState = defineSingleSelectedHandlerState<TriangleShape, SimplePolygonHandler, never>(
  (getters) => {
    return {
      getLabel: () => "TriangleSelected",
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
                    case "cr":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<TriangleShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCX = clamp(0, getTriangleCornerMaxSize(s), localP.x);
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
                    case "c0":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<TriangleShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCX = clamp(0, s.width, localP.x);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextCX = Math.round(nextCX);
                              showLabel = true;
                            }
                            return { c0: { x: nextCX / s.width, y: 0 } };
                          },
                          getControlFn: (shape, scale) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const rateX = getDefaultTriangleTopC(s).x;
                            const rateY = getC0ControlYRate(s, scale);
                            return applyAffine(getShapeTransform(s), { x: s.width * rateX, y: s.height * rateY });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const scale = ctx.getScale();
                            const s = getNormalizedSimplePolygonShape(shape);
                            const rateX = getDefaultTriangleTopC(s).x;
                            const rateY = getC0ControlYRate(s, scale);
                            const origin = { x: s.width * rateX, y: s.height * rateY };
                            renderValueLabel(
                              renderCtx,
                              Math.round(s.width * rateX),
                              applyAffine(getShapeTransform(s), origin),
                              0,
                              scale,
                            );
                          },
                        });
                      };
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
          { x: getCrControlXRate(s), y: getCrControlYRate(s, scale) },
          { x: getDefaultTriangleTopC(s).x, y: getC0ControlYRate(s, scale) },
        ]);
        return [
          ["cr", list[0]],
          ["c0", list[1]],
        ];
      },
      direction4: true,
    }),
);

function getCrControlYRate(shape: TriangleShape, scale: number) {
  return 1 + divideSafely(EDGE_ANCHOR_MARGIN, shape.height, 0) * scale;
}

function getCrControlXRate(shape: TriangleShape) {
  return divideSafely(shape.cr ?? 0, shape.width, 0);
}

function getC0ControlYRate(shape: TriangleShape, scale: number) {
  return divideSafely(-EDGE_ANCHOR_MARGIN, shape.height, 0) * scale;
}
