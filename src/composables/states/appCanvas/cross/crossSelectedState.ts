import { CrossShape } from "../../../../shapes/polygons/cross";
import { newCrossHandler, renderMovingCrossAnchor } from "../../../shapeHandlers/crossHandler";
import { movingShapeControlState } from "../movingShapeControlState";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/rectPolygon";
import { applyAffine, clamp } from "okageo";
import { snapNumber } from "../../../../utils/geometry";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";

export const newCrossSelectedState = defineSingleSelectedHandlerState(
  (getters) => {
    return {
      getLabel: () => "CrossSelected",
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
                    case "crossSize":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<CrossShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (s, p, movement) => {
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextSize = clamp(1, Math.min(s.width / 2, s.height / 2), localP.x - s.width / 2) * 2;
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextSize = snapNumber(nextSize, 1);
                              showLabel = true;
                            }
                            return { crossSize: nextSize };
                          },
                          getControlFn: (s) =>
                            applyAffine(getShapeTransform(s), { x: s.width / 2 + s.crossSize / 2, y: s.height / 2 }),
                          renderFn: (ctx, renderCtx, s) => {
                            renderMovingCrossAnchor(renderCtx, ctx.getStyleScheme(), ctx.getScale(), s, showLabel);
                          },
                        });
                      };
                  }
                }
              }
            }
        }
      },
    };
  },
  (ctx, target) => newCrossHandler({ getShapeComposite: ctx.getShapeComposite, targetId: target.id }),
);
