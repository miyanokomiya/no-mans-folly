import type { AppCanvasState } from "./core";
import { newDefaultState } from "./defaultState";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import { isLineLabelShape } from "../../../shapes/text";
import { newMovingLineLabelState } from "./lines/movingLineLabelState";
import { newMovingShapeState } from "./movingShapeState";
import { newTreeNodeMovingState } from "./tree/treeNodeMovingState";
import { newTreeRootMovingState } from "./tree/treeRootMovingState";
import { newBoardCardMovingState } from "./board/boardCardMovingState";

interface Option {
  boundingBox?: BoundingBox;
}

export function newMovingHubState(option?: Option): AppCanvasState {
  return {
    getLabel: () => "MovingHub",
    onStart(ctx) {
      const shapeMap = ctx.getShapeComposite().shapeMap;
      const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
      const count = selectedIds.length;
      if (count === 0) {
        return newDefaultState;
      } else if (count === 1) {
        const shape = shapeMap[selectedIds[0]];

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
          case "tree_root":
            return () => newTreeRootMovingState({ targetId: shape.id });
          case "tree_node":
            return () => newTreeNodeMovingState({ targetId: shape.id });
          case "board_card":
            return newBoardCardMovingState;
          default:
            return () => newMovingShapeState({ boundingBox: option?.boundingBox });
        }
      } else {
        const types = new Set(selectedIds.map((id) => shapeMap[id].type));
        if (types.size === 1) {
          const type = Array.from(types)[0];
          switch (type) {
            case "board_card":
              return newBoardCardMovingState;
          }
        }

        return () => newMovingShapeState({ boundingBox: option?.boundingBox });
      }
    },
    handleEvent() {},
  };
}
