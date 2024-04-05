import { newTrapezoidHandler } from "../../../shapeHandlers/trapezoidHandler";
import { newTransformingTrapezoidState } from "./transformingTrapezoidState";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";

export const newTrapezoidSelectedState = defineSingleSelectedHandlerState(
  (getters) => {
    return {
      getLabel: () => "TrapezoidSelected",
      handleEvent: (ctx, event) => {
        switch (event.type) {
          case "pointerdown":
            ctx.setContextMenuList();

            switch (event.data.options.button) {
              case 0: {
                const targetShape = getters.getTargetShape();
                const shapeHandler = getters.getShapeHandler();
                const hitResult = shapeHandler.hitTest(event.data.point, ctx.getScale());
                shapeHandler.saveHitResult(hitResult);
                if (hitResult) {
                  switch (hitResult.type) {
                    case "c0":
                    case "c1":
                      return () =>
                        newTransformingTrapezoidState({ targetId: targetShape.id, controlKey: hitResult.type });
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
  (ctx, target) => newTrapezoidHandler({ getShapeComposite: ctx.getShapeComposite, targetId: target.id }),
);
