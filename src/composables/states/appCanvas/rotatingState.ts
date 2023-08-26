import type { AppCanvasState } from "./core";
import { translateOnSelection } from "./commons";
import { BoundingBox, newBoundingBoxRotating } from "../../boundingBox";
import { IDENTITY_AFFINE } from "okageo";
import { resizeShape } from "../../../shapes";
import { Shape } from "../../../models";

interface Option {
  boundingBox: BoundingBox;
}

export function newRotatingState(option: Option): AppCanvasState {
  let selectedIds: { [id: string]: true };
  let resizingAffine = IDENTITY_AFFINE;

  const boundingBoxRotatingRotating = newBoundingBoxRotating({
    rotation: option.boundingBox.getRotation(),
    origin: option.boundingBox.getCenter(),
  });
  return {
    getLabel: () => "Rotating",
    onStart: async (ctx) => {
      selectedIds = ctx.getSelectedShapeIdMap();
      ctx.startDragging();
    },
    onEnd: async (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          resizingAffine = boundingBoxRotatingRotating.getAffine(event.data.start, event.data.current);

          const shapeMap = ctx.getShapeMap();
          const patchMap = Object.keys(selectedIds).reduce<{ [id: string]: Partial<Shape> }>((m, id) => {
            const shape = shapeMap[id];
            if (shape) {
              m[id] = resizeShape(ctx.getShapeStruct, shape, resizingAffine);
            }
            return m;
          }, {});
          ctx.setTmpShapeMap(patchMap);
          return;
        }
        case "pointerup": {
          ctx.patchShapes(ctx.getTmpShapeMap());
          return translateOnSelection(ctx, option.boundingBox.getTransformedBoundingBox(resizingAffine));
        }
        case "wheel":
          ctx.zoomView(event.data.delta.y);
          return;
        case "selection": {
          return translateOnSelection(ctx);
        }
        default:
          return;
      }
    },
    render: (_ctx, renderCtx) => {
      option.boundingBox.render(renderCtx, resizingAffine);
    },
  };
}
