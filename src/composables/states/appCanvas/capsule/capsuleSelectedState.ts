import { CapsuleShape } from "../../../../shapes/polygons/capsule";
import { getDirectionalLocalAbsolutePoints, getNormalizedSimplePolygonShape } from "../../../../shapes/simplePolygon";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import {
  EDGE_ANCHOR_MARGIN,
  SimplePolygonHandler,
  getCornerRadiusLXMovingState,
  getCornerRadiusLYMovingState,
  getCornerRadiusRXMovingState,
  getCornerRadiusRYMovingState,
  getResizeByState,
  handleSwitchDirection4,
  newSimplePolygonHandler,
} from "../../../shapeHandlers/simplePolygonHandler";
import { divideSafely } from "../../../../utils/geometry";

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
                      return () => getCornerRadiusLXMovingState(targetShape, "c0", event.data.options);
                    case "c1x":
                      return () => getCornerRadiusRXMovingState(targetShape, "c1", event.data.options);
                    case "c0y":
                      return () => getCornerRadiusLYMovingState(targetShape, "c0", event.data.options);
                    case "c1y":
                      return () => getCornerRadiusRYMovingState(targetShape, "c1", event.data.options);
                    case "left":
                      return () =>
                        getResizeByState(3, shapeComposite, targetShape, [
                          ["c0", { x: 0, y: 0 }],
                          ["c1", { x: 1, y: 0 }],
                        ]);
                    case "right":
                      return () =>
                        getResizeByState(1, shapeComposite, targetShape, [
                          ["c0", { x: 0, y: 0 }],
                          ["c1", { x: 1, y: 0 }],
                        ]);
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
        const marginX = divideSafely(EDGE_ANCHOR_MARGIN, s.width, 0) * scale;
        const marginY = divideSafely(EDGE_ANCHOR_MARGIN, s.height, 0) * scale;
        const list = getDirectionalLocalAbsolutePoints(target, s, [
          { x: s.c0.x, y: -marginY },
          { x: s.c1.x, y: -marginY },
          { x: -marginX, y: s.c0.y },
          { x: 1 + marginX, y: s.c1.y },
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
