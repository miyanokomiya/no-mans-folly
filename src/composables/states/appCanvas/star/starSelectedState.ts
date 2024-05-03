import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { movingShapeControlState } from "../movingShapeControlState";
import { StarShape, getMaxStarSize } from "../../../../shapes/polygons/star";
import { IVec2, applyAffine, clamp } from "okageo";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/rectPolygon";
import { getDirectionalLocalAbsolutePoints, getNormalizedSimplePolygonShape } from "../../../../shapes/simplePolygon";
import {
  EDGE_ANCHOR_MARGIN,
  SimplePolygonHandler,
  handleSwitchDirection4,
  newSimplePolygonHandler,
} from "../../../shapeHandlers/simplePolygonHandler";
import { renderValueLabel } from "../../../../utils/renderer";

export const newStarSelectedState = defineSingleSelectedHandlerState<StarShape, SimplePolygonHandler, never>(
  (getters) => {
    return {
      getLabel: () => "StarSelected",
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
                        return movingShapeControlState<StarShape>({
                          targetId: targetShape.id,
                          snapType: "disabled",
                          patchFn: (shape, p) => {
                            // Disregard snapping since the value doesn't have concrete meaning.
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
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
                        });
                      };
                    case "size":
                      return () => {
                        return movingShapeControlState<StarShape>({
                          targetId: targetShape.id,
                          snapType: "disabled",
                          patchFn: (shape, p) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            const nextRate = clamp(0, 1, localP.x / s.width);
                            return { size: Math.round(nextRate * (getMaxStarSize() - 3)) + 3 };
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
        const list = getDirectionalLocalAbsolutePoints(target, s, [s.c0, getSizeControlRate(s, scale)]);
        return [
          ["c0", list[0]],
          ["size", list[1]],
        ];
      },
      direction4: true,
    }),
);

function getSizeControlRate(shape: StarShape, scale: number): IVec2 {
  return { x: (shape.size - 3) / (getMaxStarSize() - 3), y: 1 + (EDGE_ANCHOR_MARGIN / shape.height) * scale };
}
