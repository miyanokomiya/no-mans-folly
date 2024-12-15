import {
  getLocalCornerControl,
  newBubbleHandler,
  renderBeakGuidlines,
  renderCornerGuidlines,
} from "../../../shapeHandlers/bubbleHandler";
import { RenderShapeControlFn, movingShapeControlState } from "../movingShapeControlState";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/rectPolygon";
import { getLocalAbsolutePoint, getLocalRelativeRate } from "../../../../shapes/simplePolygon";
import { IVec2, applyAffine, clamp, getDistance, getInner, getPedal, sub } from "okageo";
import { BubbleShape, getBeakControls, getMaxBeakSize } from "../../../../shapes/polygons/bubble";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { snapNumber } from "../../../../utils/geometry";

export const newBubbleSelectedState = defineSingleSelectedHandlerState(
  (getters) => {
    return {
      getLabel: () => "BubbleSelected",
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
                    case "beakTipC":
                      return () =>
                        movingShapeControlState<BubbleShape>({
                          targetId: targetShape.id,
                          patchFn: (s, p) => {
                            return { beakTipC: getLocalRelativeRate(s, applyAffine(getShapeDetransform(s), p)) };
                          },
                          renderFn: renderBeakControls,
                          getControlFn: (s) => applyAffine(getShapeTransform(s), getLocalAbsolutePoint(s, s.beakTipC)),
                        });
                    case "beakOriginC":
                      return () =>
                        movingShapeControlState<BubbleShape>({
                          targetId: targetShape.id,
                          patchFn: (s, p) => {
                            const rate = getLocalRelativeRate(s, applyAffine(getShapeDetransform(s), p));
                            return { beakOriginC: { x: clamp(0, 1, rate.x), y: clamp(0, 1, rate.y) } };
                          },
                          getControlFn: (s) =>
                            applyAffine(getShapeTransform(s), getLocalAbsolutePoint(s, s.beakOriginC)),
                          renderFn: renderBeakControls,
                          snapType: "self",
                        });
                    case "beakSizeC":
                      return () =>
                        movingShapeControlState<BubbleShape>({
                          targetId: targetShape.id,
                          patchFn: patchBeakSize,
                          getControlFn: (s) => applyAffine(getShapeTransform(s), getBeakControls(s).sizeControl),
                          renderFn: renderBeakControls,
                          snapType: "disabled",
                        });
                    case "cornerXC": {
                      let showLabel = !event.data.options.ctrl;
                      return () =>
                        movingShapeControlState<BubbleShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          extraCommands: [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
                          patchFn: (s, p, movement) => {
                            let nextRate = clamp(
                              0,
                              0.5,
                              getLocalRelativeRate(s, applyAffine(getShapeDetransform(s), p)).x,
                            );
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextRate = snapNumber(nextRate, 0.01);
                              showLabel = true;
                            }
                            return { cornerC: { x: nextRate, y: movement.shift ? nextRate : s.cornerC.y } };
                          },
                          getControlFn: (s, scale) =>
                            applyAffine(getShapeTransform(s), getLocalCornerControl(s, scale)[0]),
                          renderFn: (stateCtx, renderCtx, latestShape) => {
                            renderCornerGuidlines(
                              renderCtx,
                              stateCtx.getStyleScheme(),
                              stateCtx.getScale(),
                              latestShape,
                              showLabel,
                            );
                          },
                        });
                    }
                    case "cornerYC": {
                      let showLabel = !event.data.options.ctrl;
                      return () =>
                        movingShapeControlState<BubbleShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          extraCommands: [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
                          patchFn: (s, p, movement) => {
                            let nextRate = clamp(
                              0,
                              0.5,
                              getLocalRelativeRate(s, applyAffine(getShapeDetransform(s), p)).y,
                            );
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextRate = snapNumber(nextRate, 0.01);
                              showLabel = true;
                            }
                            return { cornerC: { x: movement.shift ? nextRate : s.cornerC.x, y: nextRate } };
                          },
                          getControlFn: (s, scale) =>
                            applyAffine(getShapeTransform(s), getLocalCornerControl(s, scale)[1]),
                          renderFn: (stateCtx, renderCtx, latestShape) => {
                            renderCornerGuidlines(
                              renderCtx,
                              stateCtx.getStyleScheme(),
                              stateCtx.getScale(),
                              latestShape,
                              showLabel,
                            );
                          },
                        });
                    }
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
  (ctx, target) => newBubbleHandler({ getShapeComposite: ctx.getShapeComposite, targetId: target.id }),
);

const renderBeakControls: RenderShapeControlFn<BubbleShape> = (stateCtx, renderCtx, latestShape) => {
  renderBeakGuidlines(renderCtx, latestShape, stateCtx.getStyleScheme(), stateCtx.getScale(), true);
};

function patchBeakSize(shape: BubbleShape, p: IVec2): Partial<BubbleShape> {
  const detransform = getShapeDetransform(shape);
  const { origin: beakOrigin, sizeControl: sizeC } = getBeakControls({ ...shape, beakSizeRate: 1 });
  const guideLine = [beakOrigin, sizeC];
  const localPedal = getPedal(applyAffine(detransform, p), guideLine);
  const isValid = getInner(sub(guideLine[1], guideLine[0]), sub(localPedal, guideLine[0])) >= 0;
  const maxSize = getMaxBeakSize(shape);
  const nextSize = isValid ? getDistance(localPedal, beakOrigin) : 0;
  const nextRate = clamp(0, 1, nextSize / maxSize);
  return { beakSizeRate: nextRate };
}
