import { ParallelogramShape } from "../../../../shapes/polygons/parallelogram";
import { newParallelogramHandler, renderMovingParallelogramAnchor } from "../../../shapeHandlers/parallelogramHandler";
import { movingShapeControlState } from "../movingShapeControlState";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/simplePolygon";
import { add, applyAffine, clamp, getRadian, rotate } from "okageo";
import { getCrossLineAndLine, snapAngle } from "../../../../utils/geometry";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";

export const newParallelogramSelectedState = defineSingleSelectedHandlerState<
  ParallelogramShape,
  ReturnType<typeof newParallelogramHandler>,
  never
>(
  (getters) => {
    return {
      getLabel: () => "ParallelogramSelected",
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
                    case "c0":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<ParallelogramShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (s, p, movement) => {
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCX = clamp(0, 1, localP.x / s.width);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              const orign = { x: targetShape.width / 2, y: targetShape.height };
                              const rad = getRadian({ x: nextCX * targetShape.width, y: 0 }, orign);
                              const snappedRad = (snapAngle((rad * 180) / Math.PI, 1) * Math.PI) / 180;
                              const snappedC = getCrossLineAndLine(
                                [
                                  { x: 0, y: 0 },
                                  { x: targetShape.width, y: 0 },
                                ],
                                [orign, add(orign, rotate({ x: 1, y: 0 }, snappedRad))],
                              );
                              if (snappedC) {
                                nextCX = clamp(0, 1, snappedC.x / targetShape.width);
                                showLabel = true;
                              }
                            }
                            return { c0: { x: nextCX, y: 0 } };
                          },
                          getControlFn: (s) =>
                            applyAffine(getShapeTransform(s), {
                              x: s.width * s.c0.x,
                              y: 0,
                            }),
                          renderFn: (ctx, renderCtx, s) => {
                            renderMovingParallelogramAnchor(
                              renderCtx,
                              ctx.getStyleScheme(),
                              ctx.getScale(),
                              s,
                              showLabel,
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
  (ctx, target) => newParallelogramHandler({ getShapeComposite: ctx.getShapeComposite, targetId: target.id }),
);
