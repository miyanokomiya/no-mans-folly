import { CylinderShape, getCylinderMaxRadiusY } from "../../../../shapes/polygons/cylinder";
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
import { renderValueLabel } from "../../../../utils/renderer";

export const newCylinderSelectedState = defineSingleSelectedHandlerState<CylinderShape, SimplePolygonHandler, never>(
  (getters) => {
    return {
      getLabel: () => "CylinderSelected",
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
                        return movingShapeControlState<CylinderShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            const maxCY = (2 * getCylinderMaxRadiusY(s)) / s.height;
                            let nextCY = clamp(0, maxCY, localP.y / s.height);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextCY = clamp(0, maxCY, Math.round(localP.y) / s.height);
                              showLabel = true;
                            }
                            return { c0: { x: 0.5, y: nextCY } };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), { x: s.width / 2, y: s.height * s.c0.y });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const s = getNormalizedSimplePolygonShape(shape);
                            renderValueLabel(
                              renderCtx,
                              Math.round(s.height * s.c0.y),
                              applyAffine(getShapeTransform(s), { x: s.width / 2, y: s.height * s.c0.y }),
                              0,
                              ctx.getScale(),
                            );
                          },
                        });
                      };
                    case "top":
                      return () => getResizeByState(0, shapeComposite, targetShape, [["c0", { x: 0.5, y: 0 }]]);
                    case "bottom":
                      return () => getResizeByState(2, shapeComposite, targetShape, [["c0", { x: 0.5, y: 0 }]]);
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
        const list = getDirectionalLocalAbsolutePoints(target, s, [s.c0, { x: 0.5, y: 0 }, { x: 0.5, y: 1 }]);
        return [
          ["c0", list[0]],
          ["top", list[1]],
          ["bottom", list[2]],
        ];
      },
      direction4: true,
    }),
);
