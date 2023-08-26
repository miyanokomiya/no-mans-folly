import type { AppCanvasState } from "./core";
import { translateOnSelection } from "./commons";
import { BoundingBox, HitResult, newBoundingBoxResizing } from "../../boundingBox";
import { IDENTITY_AFFINE, sub } from "okageo";
import { resizeShape } from "../../../shapes";
import { Shape } from "../../../models";

interface Option {
  boundingBox: BoundingBox;
  hitResult: HitResult;
}

export function newMultipleResizingState(option: Option): AppCanvasState {
  let selectedIds: { [id: string]: true };
  let resizingAffine = IDENTITY_AFFINE;

  const boundingBoxResizing = newBoundingBoxResizing({
    rotation: option.boundingBox.getRotation(),
    hitResult: option.hitResult,
    resizingBase: option.boundingBox.getResizingBase(option.hitResult),
  });

  return {
    getLabel: () => "MultipleResizing",
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
          const diff = sub(event.data.current, event.data.start);
          resizingAffine = boundingBoxResizing.getResizingAffine(diff, {
            keepAspect: event.data.shift,
            centralize: event.data.alt,
          });

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
          return translateOnSelection(ctx);
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
