import {
  getLocalCornerControl,
  newRoundedRectangleHandler,
  renderCornerGuidlines,
} from "../../../shapeHandlers/roundedRectangleHandler";
import { movingShapeControlState } from "../movingShapeControlState";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/rectPolygon";
import { applyAffine, clamp } from "okageo";
import { snapNumber } from "../../../../utils/geometry";
import { RoundedRectangleShape } from "../../../../shapes/polygons/roundedRectangle";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";

export const newRoundedRectangleSelectedState = defineSingleSelectedHandlerState(
  (getters) => {
    return {
      getLabel: () => "RectangleSelected",
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
                    case "rx":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<RoundedRectangleShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          extraCommands: [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
                          patchFn: (s, p, movement) => {
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextSize = clamp(0, s.width / 2, localP.x);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextSize = snapNumber(nextSize, 1);
                              showLabel = true;
                            }
                            return movement.shift ? { rx: nextSize, ry: nextSize } : { rx: nextSize };
                          },
                          getControlFn: (s, scale) =>
                            applyAffine(getShapeTransform(s), getLocalCornerControl(s, scale)[0]),
                          renderFn: (ctx, renderCtx, s) => {
                            renderCornerGuidlines(renderCtx, ctx.getStyleScheme(), ctx.getScale(), s, showLabel);
                          },
                        });
                      };
                    case "ry":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<RoundedRectangleShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          extraCommands: [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
                          patchFn: (s, p, movement) => {
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextSize = clamp(0, s.height / 2, localP.y);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextSize = snapNumber(nextSize, 1);
                              showLabel = true;
                            }
                            return movement.shift ? { rx: nextSize, ry: nextSize } : { ry: nextSize };
                          },
                          getControlFn: (s, scale) =>
                            applyAffine(getShapeTransform(s), getLocalCornerControl(s, scale)[1]),
                          renderFn: (ctx, renderCtx, s) => {
                            renderCornerGuidlines(renderCtx, ctx.getStyleScheme(), ctx.getScale(), s, showLabel);
                          },
                        });
                      };
                    default:
                      return;
                  }
                }
              }
            }
        }
      },
    };
  },
  (ctx, target) => newRoundedRectangleHandler({ getShapeComposite: ctx.getShapeComposite, targetId: target.id }),
);
