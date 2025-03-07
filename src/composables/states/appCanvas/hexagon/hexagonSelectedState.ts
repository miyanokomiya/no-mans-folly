import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { movingShapeControlState } from "../movingShapeControlState";
import { HexagonShape } from "../../../../shapes/polygons/hexagon";
import { add, applyAffine, clamp, getRadian, rotate } from "okageo";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/rectPolygon";
import { getDirectionalLocalAbsolutePoints, getNormalizedSimplePolygonShape } from "../../../../shapes/simplePolygon";
import { divideSafely, getCrossLineAndLine, snapRadianByAngle } from "../../../../utils/geometry";
import { renderValueLabel } from "../../../../utils/renderer";
import {
  EDGE_ANCHOR_MARGIN,
  SimplePolygonHandler,
  getCornerRadiusLXMovingState,
  getResizeByState,
  handleSwitchDirection2,
  newSimplePolygonHandler,
} from "../../../shapeHandlers/simplePolygonHandler";
import { AppCanvasStateContext } from "../core";
import { CanvasCTX } from "../../../../utils/types";

export const newHexagonSelectedState = defineSingleSelectedHandlerState<HexagonShape, SimplePolygonHandler, never>(
  (getters) => {
    return {
      getLabel: () => "HexagonSelected",
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
                    case "c0x_d":
                      return () =>
                        getCornerRadiusLXMovingState(targetShape, "c0", event.data.options, {
                          disableProportional: true,
                        });
                    case "c0x":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<HexagonShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCX = clamp(0, 0.5, localP.x / s.width);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              const origin = { x: 0, y: shape.height * shape.c0.y };
                              const rad = getRadian({ x: nextCX * shape.width, y: 0 }, origin);
                              const snappedRad = snapRadianByAngle(rad, 1);
                              const snappedC = getCrossLineAndLine(
                                [
                                  { x: 0, y: 0 },
                                  { x: shape.width, y: 0 },
                                ],
                                [origin, add(origin, rotate({ x: 1, y: 0 }, snappedRad))],
                              );
                              if (snappedC) {
                                nextCX = clamp(0, 0.5, snappedC.x / shape.width);
                                showLabel = true;
                              }
                            }
                            return { c0: { x: nextCX, y: shape.c0.y } };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), { x: s.width * s.c0.x, y: 0 });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;
                            renderAngle(ctx, renderCtx, shape);
                          },
                        });
                      };
                    case "c0y":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<HexagonShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCY = clamp(0, 0.5, localP.y / s.height);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              const origin = { x: shape.width * shape.c0.x, y: 0 };
                              const rad = getRadian({ x: 0, y: nextCY * shape.height }, origin);
                              const snappedRad = snapRadianByAngle(rad, 1);
                              const snappedC = getCrossLineAndLine(
                                [
                                  { x: 0, y: 0 },
                                  { x: 0, y: shape.height },
                                ],
                                [origin, add(origin, rotate({ x: 1, y: 0 }, snappedRad))],
                              );
                              if (snappedC) {
                                nextCY = clamp(0, 0.5, snappedC.y / shape.height);
                                showLabel = true;
                              }
                            }

                            return { c0: { x: shape.c0.x, y: nextCY } };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), { x: 0, y: shape.height * s.c0.y });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;
                            renderAngle(ctx, renderCtx, shape);
                          },
                        });
                      };
                    case "bottom":
                      return () => getResizeByState(2, shapeComposite, targetShape, [["c0", { x: 0, y: 0 }]]);
                    case "right":
                      return () => getResizeByState(1, shapeComposite, targetShape, [["c0", { x: 0, y: 0 }]]);
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
          { x: s.c0.x, y: 0 },
          { x: 0, y: s.c0.y },
          { x: 0.5, y: 1 },
          { x: 1, y: 0.5 },
        ]);
        return [
          ["c0x_d", list[0]],
          ["c0x", list[1]],
          ["c0y", list[2]],
          ["bottom", list[3]],
          ["right", list[4]],
        ];
      },
      direction4: true,
    }),
);

function renderAngle(ctx: AppCanvasStateContext, renderCtx: CanvasCTX, shape: HexagonShape) {
  const s = getNormalizedSimplePolygonShape(shape);
  const origin = { x: 0, y: s.height * s.c0.y };
  const rad = getRadian({ x: s.width * s.c0.x, y: 0 }, origin);
  const angle = Math.round((-rad * 180) / Math.PI);
  renderValueLabel(renderCtx, angle, applyAffine(getShapeTransform(s), origin), 0, ctx.getScale());
}
