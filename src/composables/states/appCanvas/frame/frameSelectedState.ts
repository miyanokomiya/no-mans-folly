import { FrameShape } from "../../../../shapes/frame";
import { getAllFrameIdsInTreeOrder } from "../../../frame";
import { FrameHandler, newFrameHandler } from "../../../shapeHandlers/frameHandler";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { getCommonCommandExams } from "../commons";
import { defineSingleSelectedHandlerState } from "../singleSelectedHandlerState";

export const newFrameSelectedState = defineSingleSelectedHandlerState<FrameShape, FrameHandler, never>(
  (getters) => {
    return {
      getLabel: () => "FrameSelected",
      onStart: (ctx) => {
        ctx.setCommandExams([COMMAND_EXAM_SRC.MOVE_ONLY_FRAME, ...getCommonCommandExams(ctx)]);
      },
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
                    const ids = getAllFrameIdsInTreeOrder(shapeComposite);
                    const targetIndex = ids.indexOf(targetShape.id);
                    const nextId = ids[targetIndex - 1];
                    if (!nextId) return null;

                    ctx.selectShape(nextId);
                    return () =>
                      ctx.states.newPanToShapeState({
                        ids: [nextId],
                        duration: 150,
                        scaling: true,
                      });
                  }
                  case "jump-next": {
                    const shapeComposite = ctx.getShapeComposite();
                    const ids = getAllFrameIdsInTreeOrder(shapeComposite);
                    const targetIndex = ids.indexOf(targetShape.id);
                    const nextId = ids.at(targetIndex + 1);
                    if (!nextId) return null;

                    ctx.selectShape(nextId);
                    return () =>
                      ctx.states.newPanToShapeState({
                        ids: [nextId],
                        duration: 150,
                        scaling: true,
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
