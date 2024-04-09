import { TriangleShape } from "../../../../shapes/polygons/triangle";
import { movingShapeControlState } from "../movingShapeControlState";
import {
  getDirectionalLocalAbsolutePoints,
  getNormalizedSimplePolygonShape,
  getShapeDetransform,
  getShapeTransform,
} from "../../../../shapes/simplePolygon";
import { applyAffine, clamp } from "okageo";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { renderValueLabel } from "../../../../utils/renderer";
import {
  EDGE_ANCHOR_MARGIN,
  SimplePolygonHandler,
  handleSwitchDirection4,
  newSimplePolygonHandler,
} from "../../../shapeHandlers/simplePolygonHandler";

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
                            let nextCX = clamp(0, s.width / 2, localP.x);
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
          { x: getCrControlXRate(s), y: (-EDGE_ANCHOR_MARGIN / s.height) * scale },
        ]);
        return [["cr", list[0]]];
      },
      direction4: true,
    }),
);

function getCrControlYRate(shape: TriangleShape, scale: number) {
  return (-EDGE_ANCHOR_MARGIN / shape.height) * scale;
}

function getCrControlXRate(shape: TriangleShape) {
  return (shape.cr ?? 0) / shape.width;
}