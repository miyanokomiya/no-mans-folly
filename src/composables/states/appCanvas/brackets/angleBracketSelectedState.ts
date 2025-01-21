import { AngleBracketShape, getAngleBracketThickness } from "../../../../shapes/polygons/angleBracket";
import { movingShapeControlState } from "../movingShapeControlState";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/rectPolygon";
import { applyAffine, IVec2 } from "okageo";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { newSimplePolygonHandler, SimplePolygonHandler } from "../../../shapeHandlers/simplePolygonHandler";
import { renderValueLabel } from "../../../../utils/renderer";

export const newAngleBracketSelectedState = defineSingleSelectedHandlerState<
  AngleBracketShape,
  SimplePolygonHandler,
  never
>(
  (getters) => {
    return {
      getLabel: () => "AngleBracketSelected",
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
                    case "thickness":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<AngleBracketShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const localP = applyAffine(getShapeDetransform(shape), p);
                            let nextValue = getAngleBracketThickness({ ...shape, thickness: localP.y });
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextValue = Math.round(nextValue);
                              showLabel = true;
                            }
                            return { thickness: nextValue };
                          },
                          getControlFn: (shape) => {
                            return applyAffine(getShapeTransform(shape), getThicknessControl(shape));
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            renderValueLabel(
                              renderCtx,
                              shape.thickness,
                              applyAffine(getShapeTransform(shape), getThicknessControl(shape)),
                              0,
                              ctx.getScale(),
                            );
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
  (ctx, target) =>
    newSimplePolygonHandler({
      getShapeComposite: ctx.getShapeComposite,
      targetId: target.id,
      getAnchors: () => {
        return [["thickness", getThicknessControl(target)]];
      },
    }),
);

function getThicknessControl(shape: AngleBracketShape): IVec2 {
  const thickness = getAngleBracketThickness(shape);
  return { x: shape.width, y: thickness };
}
