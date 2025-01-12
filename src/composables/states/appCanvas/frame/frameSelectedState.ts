import { FrameShape } from "../../../../shapes/frame";
import { getAllFrameShapes } from "../../../frame";
import { FrameHandler, newFrameHandler } from "../../../shapeHandlers/frameHandler";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";

export const newFrameSelectedState = defineSingleSelectedHandlerState<FrameShape, FrameHandler, never>(
  (getters) => {
    return {
      getLabel: () => "FrameSelected",
      handleEvent: (ctx, event) => {
        switch (event.type) {
          case "pointerdown":
            switch (event.data.options.button) {
              case 0: {
                const targetShape = getters.getTargetShape();
                const shapeHandler = getters.getShapeHandler();

                const hitResult = shapeHandler.hitTest(event.data.point, ctx.getScale());
                shapeHandler.saveHitResult(hitResult);
                if (!hitResult) return;

                switch (hitResult.type) {
                  case "jump-back": {
                    const shapeComposite = ctx.getShapeComposite();
                    const frames = getAllFrameShapes(shapeComposite);
                    const targetIndex = frames.findIndex((f) => f.id === targetShape.id);
                    if (targetIndex === -1 || targetIndex === 0) return null;

                    const nextId = frames[targetIndex - 1].id;
                    ctx.selectShape(nextId);
                    return () =>
                      ctx.states.newPanToShapeState({
                        ids: [nextId],
                        duration: 150,
                      });
                  }
                  case "jump-next": {
                    const shapeComposite = ctx.getShapeComposite();
                    const frames = getAllFrameShapes(shapeComposite);
                    const targetIndex = frames.findIndex((f) => f.id === targetShape.id);
                    if (targetIndex === -1 || targetIndex === frames.length - 1) return null;

                    const nextId = frames[targetIndex + 1].id;
                    ctx.selectShape(nextId);
                    return () =>
                      ctx.states.newPanToShapeState({
                        ids: [nextId],
                        duration: 150,
                      });
                  }
                }
              }
            }
        }
      },
    };
  },
  (ctx, target) =>
    newFrameHandler({
      getShapeComposite: ctx.getShapeComposite,
      targetId: target.id,
    }),
);
