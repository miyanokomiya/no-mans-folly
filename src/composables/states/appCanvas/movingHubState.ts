import type { AppCanvasState } from "./core";
import { newDefaultState } from "./defaultState";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { isLineLabelShape } from "../../../shapes/text";
import { newMovingLineLabelState } from "./lines/movingLineLabelState";
import { newMovingShapeState } from "./movingShapeState";

interface Option {
  boundingBox?: BoundingBox;
}

export function newMovingHubState(option?: Option): AppCanvasState {
  return {
    getLabel: () => "MovingHub",
    onStart(ctx) {
      const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
      const count = selectedIds.length;
      if (count === 0) {
        return newDefaultState;
      } else if (count === 1) {
        const shape = ctx.getShapeComposite().shapeMap[selectedIds[0]];

        const shapeComposite = ctx.getShapeComposite();
        const boundingBox =
          option?.boundingBox ??
          newBoundingBox({
            path: shapeComposite.getLocalRectPolygon(shape),
            styleScheme: ctx.getStyleScheme(),
            scale: ctx.getScale(),
          });

        if (isLineLabelShape(shape)) {
          return () => newMovingLineLabelState({ boundingBox });
        }

        switch (shape.type) {
          case "tree_node":
            // TODO
            return () => newMovingShapeState({ boundingBox: option?.boundingBox });
          default:
            return () => newMovingShapeState({ boundingBox: option?.boundingBox });
        }
      } else {
        return () => newMovingShapeState({ boundingBox: option?.boundingBox });
      }
    },
    handleEvent() {},
  };
}
