import type { AppCanvasState } from "../core";
import { IDENTITY_AFFINE, multiAffine } from "okageo";
import { mergeMap } from "../../../../utils/commons";
import { LineLabelHandler, newLineLabelHandler, renderParentLineRelation } from "../../../lineLabelHandler";
import { resizeShape } from "../../../../shapes";
import { newSelectionHubState } from "../selectionHubState";
import { BoundingBox, newBoundingBoxRotating } from "../../../boundingBox";
import { LineShape } from "../../../../shapes/line";
import { TextShape } from "../../../../shapes/text";

interface Option {
  boundingBox: BoundingBox;
}

export function newRotatingLineLabelState(option: Option): AppCanvasState {
  const boundingBoxRotating = newBoundingBoxRotating({
    rotation: option.boundingBox.getRotation(),
    origin: option.boundingBox.getCenter(),
  });
  let labelShape: TextShape;
  let parentLineShape: LineShape;
  let lineLabelHandler: LineLabelHandler;
  let affine = IDENTITY_AFFINE;

  return {
    getLabel: () => "RotatingLineLabel",
    onStart: (ctx) => {
      ctx.startDragging();

      const id = ctx.getLastSelectedShapeId();
      const shapeMap = ctx.getShapeComposite().shapeMap;
      labelShape = shapeMap[id ?? ""] as TextShape;
      if (!labelShape) return newSelectionHubState;

      parentLineShape = shapeMap[labelShape.parentId ?? ""] as LineShape;
      if (!parentLineShape) return newSelectionHubState;

      lineLabelHandler = newLineLabelHandler({ ctx });
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const affineSrc = boundingBoxRotating.getAffine(event.data.start, event.data.current, event.data.ctrl);
          const patch = { [labelShape.id]: resizeShape(ctx.getShapeStruct, labelShape, affineSrc) };
          const labelPatch = lineLabelHandler.onModified(patch);
          const mergedPatch = mergeMap(patch, labelPatch);
          ctx.setTmpShapeMap(mergedPatch);

          // Save final transition as current affine
          const updated = mergedPatch[labelShape.id];
          affine = multiAffine(
            updated.p ? [1, 0, 0, 1, updated.p.x - labelShape.p.x, updated.p.y - labelShape.p.y] : IDENTITY_AFFINE,
            affineSrc,
          );
          return;
        }
        case "pointerup": {
          const val = ctx.getTmpShapeMap();
          if (Object.keys(val).length > 0) {
            ctx.patchShapes(val);
          }
          return newSelectionHubState;
        }
        case "selection": {
          return newSelectionHubState;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const tmpShape = ctx.getTmpShapeMap()[labelShape.id] ?? {};
      renderParentLineRelation(ctx, renderCtx, { ...labelShape, ...tmpShape }, parentLineShape);
      option.boundingBox.render(renderCtx, affine, undefined, ctx.getScale());
    },
  };
}
