import {
  getDirectionalLocalAbsolutePoints,
  getNormalizedSimplePolygonShape,
  getShapeDetransform,
  getShapeTransform,
} from "../../../../shapes/simplePolygon";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import {
  SimplePolygonHandler,
  getResizeByState,
  handleSwitchDirection4,
  newSimplePolygonHandler,
} from "../../../shapeHandlers/simplePolygonHandler";
import { movingShapeControlState } from "../movingShapeControlState";
import { applyAffine, clamp } from "okageo";
import { TwoSidedArrowShape } from "../../../../shapes/twoSidedArrow";

export const newArrowTwoSelectedState = defineSingleSelectedHandlerState<
  TwoSidedArrowShape,
  SimplePolygonHandler,
  never
>(
  (getters) => {
    return {
      getLabel: () => "ArrowTwoSelected",
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
                    case "headControl":
                      return () => {
                        return movingShapeControlState<TwoSidedArrowShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            const nextC = {
                              x: clamp(0.5, 1, localP.x / s.width),
                              y: clamp(0, 0.5, localP.y / s.height),
                            };
                            return { headControl: nextC };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), {
                              x: s.width * s.headControl.x,
                              y: s.height * s.headControl.y,
                            });
                          },
                        });
                      };
                    case "left":
                      return () =>
                        getResizeByState(3, shapeComposite, targetShape, [["headControl", { x: 1, y: 0.5 }]]);
                    case "right":
                      return () =>
                        getResizeByState(1, shapeComposite, targetShape, [["headControl", { x: 1, y: 0.5 }]]);
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
        const list = getDirectionalLocalAbsolutePoints(target, s, [s.headControl, { x: 0, y: 0.5 }, { x: 1, y: 0.5 }]);
        return [
          ["headControl", list[0]],
          ["left", list[1]],
          ["right", list[2]],
        ];
      },
      direction4: true,
    }),
);
