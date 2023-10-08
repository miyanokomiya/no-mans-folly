import type { AppCanvasState } from "../core";
import { AffineMatrix, IDENTITY_AFFINE, sub } from "okageo";
import { mapReduce, patchPipe } from "../../../../utils/commons";
import { LineLabelHandler, newLineLabelHandler, renderParentLineRelation } from "../../../lineLabelHandler";
import { resizeShape } from "../../../../shapes";
import { newSelectionHubState } from "../selectionHubState";
import { BoundingBox } from "../../../boundingBox";
import { LineShape } from "../../../../shapes/line";
import { TextShape } from "../../../../shapes/text";

interface Option {
  boundingBox: BoundingBox;
}

export function newMovingLineLabelState(option: Option): AppCanvasState {
  const boundingBox = option.boundingBox;
  let labelShape: TextShape;
  let parentLineShape: LineShape;
  let lineLabelHandler: LineLabelHandler;
  let affine = IDENTITY_AFFINE;

  return {
    getLabel: () => "MovingLineLabel",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCursor("move");

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
      ctx.setCursor();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const d = sub(event.data.current, event.data.start);
          const affineSrc: AffineMatrix = [1, 0, 0, 1, d.x, d.y];
          const patched = patchPipe(
            [
              (src) => mapReduce(src, (s) => resizeShape(ctx.getShapeStruct, s, affineSrc)),
              (_src, patch) => lineLabelHandler.onModified(patch),
            ],
            { [labelShape.id]: labelShape },
          );
          ctx.setTmpShapeMap(patched.patch);

          // Save final transition as current affine
          const updated = patched.patch[labelShape.id];
          affine = updated.p
            ? [1, 0, 0, 1, updated.p.x - labelShape.p.x, updated.p.y - labelShape.p.y]
            : IDENTITY_AFFINE;
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
      boundingBox.render(renderCtx, affine);
    },
  };
}
