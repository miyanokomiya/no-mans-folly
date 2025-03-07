import { RibbonShape } from "../../../../shapes/polygons/ribbon";
import { getDirectionalLocalAbsolutePoints, getNormalizedSimplePolygonShape } from "../../../../shapes/simplePolygon";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import {
  EDGE_ANCHOR_MARGIN,
  SimplePolygonHandler,
  getCornerRadiusRXMovingState,
  getResizeByState,
  handleSwitchDirection2,
  newSimplePolygonHandler,
} from "../../../shapeHandlers/simplePolygonHandler";
import { divideSafely } from "../../../../utils/geometry";

export const newRibbonSelectedState = defineSingleSelectedHandlerState<RibbonShape, SimplePolygonHandler, never>(
  (getters) => {
    return {
      getLabel: () => "RibbonSelected",
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
                      return () =>
                        getCornerRadiusRXMovingState(targetShape, "c0", event.data.options, {
                          disableProportional: true,
                        });
                    case "left":
                      return () => getResizeByState(3, shapeComposite, targetShape, [["c0", { x: 1, y: 0 }]]);
                    case "right":
                      return () => getResizeByState(1, shapeComposite, targetShape, [["c0", { x: 1, y: 0 }]]);
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
        const marginY = divideSafely(EDGE_ANCHOR_MARGIN, s.height, 0) * scale;
        const list = getDirectionalLocalAbsolutePoints(target, s, [
          { x: s.c0.x, y: -marginY },
          { x: 0, y: 0.5 },
          { x: 1, y: 0.5 },
        ]);
        return [
          ["c0", list[0]],
          ["left", list[1]],
          ["right", list[2]],
        ];
      },
      direction4: true,
    }),
);
