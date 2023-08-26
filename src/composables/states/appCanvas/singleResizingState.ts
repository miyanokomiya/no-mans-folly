import type { AppCanvasState } from "./core";
import { translateOnSelection } from "./commons";
import { BoundingBox, HitResult, newBoundingBoxResizing } from "../../boundingBox";
import { IDENTITY_AFFINE, sub } from "okageo";
import { resizeLocal } from "../../../shapes";

interface Option {
  boundingBox: BoundingBox;
  hitResult: HitResult;
}

export function newSingleResizingState(option: Option): AppCanvasState {
  let selectedId: string | undefined;
  let resizingAffine = IDENTITY_AFFINE;

  const boundingBoxResizing = newBoundingBoxResizing({
    rotation: option.boundingBox.getRotation(),
    hitResult: option.hitResult,
    resizingBase: option.boundingBox.getResizingBase(option.hitResult),
  });

  return {
    getLabel: () => "SingleResizing",
    onStart: async (ctx) => {
      selectedId = ctx.getLastSelectedShapeId();
      ctx.startDragging();
    },
    onEnd: async (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
    },
    handleEvent: async (ctx, event) => {
      if (!selectedId) return translateOnSelection(ctx);

      switch (event.type) {
        case "pointermove": {
          const diff = sub(event.data.current, event.data.start);
          resizingAffine = boundingBoxResizing.getResizingAffine(diff, {
            keepAspect: event.data.shift,
            centralize: event.data.alt,
          });

          const resizedShape = resizeLocal(ctx.getShapeStruct, ctx.getShapeMap()[selectedId], resizingAffine);
          ctx.setTmpShapeMap({ [selectedId]: resizedShape });
          return;
        }
        case "pointerup": {
          ctx.patchShapes({ [selectedId]: ctx.getTmpShapeMap()[selectedId] });
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
