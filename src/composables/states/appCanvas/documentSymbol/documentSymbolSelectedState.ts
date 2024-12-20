import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";
import { movingShapeControlState } from "../movingShapeControlState";
import { DocumentSymbolShape } from "../../../../shapes/polygons/documentSymbol";
import { applyAffine, clamp } from "okageo";
import { getShapeDetransform, getShapeTransform } from "../../../../shapes/rectPolygon";
import { getDirectionalLocalAbsolutePoints, getNormalizedSimplePolygonShape } from "../../../../shapes/simplePolygon";
import { renderValueLabel } from "../../../../utils/renderer";
import {
  SimplePolygonHandler,
  getResizeByState,
  handleSwitchDirection4,
  newSimplePolygonHandler,
} from "../../../shapeHandlers/simplePolygonHandler";

export const newDocumentSymbolSelectedState = defineSingleSelectedHandlerState<
  DocumentSymbolShape,
  SimplePolygonHandler,
  never
>(
  (getters) => {
    return {
      getLabel: () => "DocumentSymbolSelected",
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
                        return movingShapeControlState<DocumentSymbolShape>({
                          targetId: targetShape.id,
                          snapType: "custom",
                          patchFn: (shape, p, movement) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            const localP = applyAffine(getShapeDetransform(s), p);
                            let nextCY = clamp(0, 1, localP.y / s.height);
                            if (movement.ctrl) {
                              showLabel = false;
                            } else {
                              const d = s.height - localP.y;
                              nextCY = clamp(0, 1, 1 - Math.round(d) / s.height);
                              showLabel = true;
                            }
                            return { c0: { x: 0.75, y: nextCY } };
                          },
                          getControlFn: (shape) => {
                            const s = getNormalizedSimplePolygonShape(shape);
                            return applyAffine(getShapeTransform(s), { x: s.width * 0.75, y: s.height * s.c0.y });
                          },
                          renderFn: (ctx, renderCtx, shape) => {
                            if (!showLabel) return;

                            const s = getNormalizedSimplePolygonShape(shape);
                            const d = Math.round(s.height * (1 - s.c0.y));
                            renderValueLabel(
                              renderCtx,
                              d,
                              applyAffine(getShapeTransform(s), { x: s.width * 0.75, y: s.height * s.c0.y }),
                              0,
                              ctx.getScale(),
                            );
                          },
                        });
                      };
                    case "top":
                      return () => getResizeByState(0, shapeComposite, targetShape, [["c0", { x: 0.75, y: 1 }]]);
                    case "bottom":
                      return () => getResizeByState(2, shapeComposite, targetShape, [["c0", { x: 0.75, y: 1 }]]);
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
