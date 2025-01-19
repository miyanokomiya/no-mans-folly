import { BracketShape, getBracketRadius, getBracketThickness } from "../../../../shapes/polygons/bracket";
import { movingShapeControlState } from "../movingShapeControlState";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/rectPolygon";
import { applyAffine, IVec2 } from "okageo";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { newSimplePolygonHandler, SimplePolygonHandler } from "../../../shapeHandlers/simplePolygonHandler";
import { renderValueLabel } from "../../../../utils/renderer";

export const newBracketSelectedState = defineSingleSelectedHandlerState<BracketShape, SimplePolygonHandler, never>(
  (getters) => {
    return {
      getLabel: () => "BracketSelected",
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
                        return movingShapeControlState<BracketShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const localP = applyAffine(getShapeDetransform(shape), p);
                            let nextValue = getBracketThickness({ ...shape, thickness: localP.y });
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
                              getBracketThickness(shape),
                              applyAffine(getShapeTransform(shape), getThicknessControl(shape)),
                              0,
                              ctx.getScale(),
                            );
                          },
                        });
                      };
                    case "radius":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<BracketShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const localP = applyAffine(getShapeDetransform(shape), p);
                            const thickness = getBracketThickness(shape);
                            let nextValue = getBracketRadius({ ...shape, r: localP.x - thickness });
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextValue = Math.round(nextValue);
                              showLabel = true;
                            }
                            return { r: nextValue };
                          },
                          getControlFn: (shape) => {
                            return applyAffine(getShapeTransform(shape), getRadiusControl(shape));
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            renderValueLabel(
                              renderCtx,
                              getBracketRadius(shape),
                              applyAffine(getShapeTransform(shape), getRadiusControl(shape)),
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
        return [
          ["thickness", getThicknessControl(target)],
          ["radius", getRadiusControl(target)],
        ];
      },
    }),
);

function getThicknessControl(shape: BracketShape): IVec2 {
  return { x: shape.width, y: getBracketThickness(shape) };
}

function getRadiusControl(shape: BracketShape): IVec2 {
  const thickness = getBracketThickness(shape);
  const r = getBracketRadius(shape);
  return { x: thickness + r, y: thickness };
}
