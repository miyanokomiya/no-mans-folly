import { movingShapeControlState } from "../movingShapeControlState";
import { getRectShapeRect, getShapeDetransform, getShapeTransform } from "../../../../shapes/rectPolygon";
import { applyAffine, clamp, IVec2 } from "okageo";
import { snapNumber } from "../../../../utils/geometry";
import {
  getSpikeParameters,
  getSpikyInnerRectangle,
  SpikyRectangleShape,
} from "../../../../shapes/polygons/spikyRectangle";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { newSimplePolygonHandler, SimplePolygonHandler } from "../../../shapeHandlers/simplePolygonHandler";
import { StyleScheme } from "../../../../models";
import { applyLocalSpace, renderValueLabel } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";

export const newSpikyRectangleSelectedState = defineSingleSelectedHandlerState<
  SpikyRectangleShape,
  SimplePolygonHandler,
  never
>(
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
                        return movingShapeControlState<SpikyRectangleShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          extraCommands: [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
                          patchFn: (s, p, movement) => {
                            const innerRect = getSpikyInnerRectangle(s);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextSize = clamp(0, innerRect.width / 2, localP.x - innerRect.x);
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
                            renderCornerGuidlinesForRadius(
                              renderCtx,
                              ctx.getStyleScheme(),
                              ctx.getScale(),
                              s,
                              showLabel,
                            );
                          },
                        });
                      };
                    case "ry":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<SpikyRectangleShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          extraCommands: [COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY],
                          patchFn: (s, p, movement) => {
                            const innerRect = getSpikyInnerRectangle(s);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextSize = clamp(0, innerRect.height / 2, localP.y - innerRect.y);
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
                            renderCornerGuidlinesForRadius(
                              renderCtx,
                              ctx.getStyleScheme(),
                              ctx.getScale(),
                              s,
                              showLabel,
                            );
                          },
                        });
                      };
                    case "spike":
                      return () => {
                        let showLabel = !event.data.options.ctrl;
                        return movingShapeControlState<SpikyRectangleShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (s, p, movement) => {
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextWidth = clamp(0, s.width / 2, s.width / 2 - localP.x) * 2;
                            let nextHeight = clamp(0, s.height / 2, localP.y);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              nextWidth = snapNumber(nextWidth, 2);
                              nextHeight = snapNumber(nextHeight, 1);
                              showLabel = true;
                            }
                            return { spikeSize: { width: nextWidth, height: nextHeight } };
                          },
                          getControlFn: (s) =>
                            applyAffine(getShapeTransform(s), {
                              x: (s.width - s.spikeSize.width) / 2,
                              y: s.spikeSize.height,
                            }),
                          renderFn: (ctx, renderCtx, s) => {
                            renderCornerGuidlinesForSpike(
                              renderCtx,
                              ctx.getStyleScheme(),
                              ctx.getScale(),
                              s,
                              showLabel,
                            );
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
  (ctx, target) =>
    newSimplePolygonHandler({
      getShapeComposite: ctx.getShapeComposite,
      targetId: target.id,
      getAnchors: () => {
        const scale = ctx.getScale();
        const radiusC = getLocalCornerControl(target, scale);
        return [
          ["rx", radiusC[0]],
          ["ry", radiusC[1]],
          ["spike", { x: (target.width - target.spikeSize.width) / 2, y: target.spikeSize.height }],
        ];
      },
    }),
);

function getLocalCornerControl(shape: SpikyRectangleShape, scale: number): [IVec2, IVec2] {
  const margin = 16 * scale;
  const { rx, ry } = getSpikeParameters(shape);
  const rect = getSpikyInnerRectangle(shape);
  return [
    { x: rect.x + rx, y: rect.y - margin },
    { x: rect.x - margin, y: rect.y + ry },
  ];
}

function renderCornerGuidlinesForRadius(
  renderCtx: CanvasRenderingContext2D,
  style: StyleScheme,
  scale: number,
  shape: SpikyRectangleShape,
  showLabel = false,
) {
  applyLocalSpace(renderCtx, getRectShapeRect(shape), shape.rotation, () => {
    const innerRect = getSpikyInnerRectangle(shape);
    const [cornerXC, cornerYC] = getLocalCornerControl(shape, scale);

    if (showLabel) {
      const margin = 20 * scale;
      renderValueLabel(
        renderCtx,
        shape.rx ?? 0,
        { x: innerRect.x, y: innerRect.y - margin },
        -shape.rotation,
        scale,
        true,
      );
      renderValueLabel(
        renderCtx,
        shape.ry ?? 0,
        { x: innerRect.x - margin, y: innerRect.y },
        -shape.rotation,
        scale,
        true,
      );
    }

    applyStrokeStyle(renderCtx, {
      color: style.selectionSecondaly,
      width: 2 * scale,
      dash: "short",
    });

    renderCtx.beginPath();
    renderCtx.rect(innerRect.x, innerRect.y, cornerXC.x - innerRect.x, cornerYC.y - innerRect.y);
    renderCtx.stroke();
  });
}

function renderCornerGuidlinesForSpike(
  renderCtx: CanvasRenderingContext2D,
  style: StyleScheme,
  scale: number,
  shape: SpikyRectangleShape,
  showLabel = false,
) {
  applyLocalSpace(renderCtx, getRectShapeRect(shape), shape.rotation, () => {
    if (showLabel) {
      const margin = 20 * scale;
      renderValueLabel(
        renderCtx,
        shape.spikeSize.width / 2,
        { x: shape.width / 2 - shape.spikeSize.width / 4, y: -margin },
        -shape.rotation,
        scale,
        true,
      );
      renderValueLabel(
        renderCtx,
        shape.spikeSize.height,
        { x: shape.width / 2 - shape.spikeSize.width / 2 - margin, y: shape.spikeSize.height / 2 },
        -shape.rotation,
        scale,
        true,
      );
    }

    applyStrokeStyle(renderCtx, {
      color: style.selectionSecondaly,
      width: 2 * scale,
      dash: "short",
    });

    renderCtx.beginPath();
    renderCtx.rect((shape.width - shape.spikeSize.width) / 2, 0, shape.spikeSize.width / 2, shape.spikeSize.height);
    renderCtx.stroke();
  });
}
