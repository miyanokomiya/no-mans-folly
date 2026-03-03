import { CornerBlockShape } from "../../../../shapes/polygons/cornerBlock";
import { movingShapeControlState } from "../movingShapeControlState";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/rectPolygon";
import { getDirectionalLocalAbsolutePoints, getNormalizedSimplePolygonShape } from "../../../../shapes/simplePolygon";
import { applyAffine, clamp } from "okageo";
import {
  SimplePolygonHandler,
  getResizeByState,
  handleSwitchDirection4,
  newSimplePolygonHandler,
} from "../../../shapeHandlers/simplePolygonHandler";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { divideSafely } from "../../../../utils/geometry";

export const newCornerBlockSelectedState = defineSingleSelectedHandlerState<
  CornerBlockShape,
  SimplePolygonHandler,
  never
>(
  (getters) => {
    return {
      getLabel: () => "CornerBlockSelected",
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
                        return movingShapeControlState<CornerBlockShape>({
                          targetId: targetShape.id,
                          patchFn: (shape, p) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            const nextC = {
                              x: clamp(0, 1, divideSafely(localP.x, s.width, 0)),
                              y: clamp(0, 1, divideSafely(localP.y, s.height, 0)),
                            };
                            return { c0: nextC };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), { x: s.width * s.c0.x, y: s.height * s.c0.y });
                          },
                        });
                      };
                    case "bottom":
                      return () => getResizeByState(2, shapeComposite, targetShape, [["c0", { x: 1, y: 1 }]]);
                    case "right":
                      return () => getResizeByState(1, shapeComposite, targetShape, [["c0", { x: 1, y: 1 }]]);
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
        const list = getDirectionalLocalAbsolutePoints(target, s, [s.c0, { x: 0.5, y: 1 }, { x: 1, y: 0.5 }]);
        return [
          ["c0", list[0]],
          ["bottom", list[1]],
          ["right", list[2]],
        ];
      },
      direction4: true,
    }),
);
