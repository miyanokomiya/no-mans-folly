import type { AppCanvasState } from "../core";
import { AffineMatrix, IDENTITY_AFFINE, sub } from "okageo";
import { getPatchByUpdateLabelAlign, renderParentLineRelation } from "../../../lineLabelHandler";
import { BoundingBox } from "../../../boundingBox";
import { LineShape } from "../../../../shapes/line";
import { TextShape } from "../../../../shapes/text";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { isObjectEmpty } from "../../../../utils/commons";

interface Option {
  boundingBox: BoundingBox;
}

export function newMovingLineLabelState(option: Option): AppCanvasState {
  const boundingBox = option.boundingBox;
  let labelShape: TextShape;
  let parentLineShape: LineShape;
  let affine = IDENTITY_AFFINE;

  return {
    getLabel: () => "MovingLineLabel",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCursor("move");
      ctx.setCommandExams([COMMAND_EXAM_SRC.LABEL_ALIGN]);

      const id = ctx.getLastSelectedShapeId();
      const shapeMap = ctx.getShapeComposite().shapeMap;
      labelShape = shapeMap[id ?? ""] as TextShape;
      if (!labelShape) return ctx.states.newSelectionHubState;

      parentLineShape = shapeMap[labelShape.parentId ?? ""] as LineShape;
      if (!parentLineShape) return ctx.states.newSelectionHubState;
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
      ctx.setCursor();
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const shapeComposite = ctx.getShapeComposite();
          let patch: { [id: string]: Partial<TextShape> } | undefined;

          if (event.data.shift) {
            // Keep the latest label position.
            const tmpLabel = ctx.getTmpShapeMap()[labelShape.id] as TextShape;
            if (tmpLabel) {
              patch = {
                [labelShape.id]: {
                  ...tmpLabel,
                  ...getPatchByUpdateLabelAlign(
                    parentLineShape,
                    { ...labelShape, ...tmpLabel },
                    event.data.current,
                    ctx.getScale(),
                  ),
                },
              };
            } else {
              const labelPatch = getPatchByUpdateLabelAlign(
                parentLineShape,
                labelShape,
                event.data.current,
                ctx.getScale(),
              );
              if (!isObjectEmpty(labelPatch)) {
                patch = { [labelShape.id]: labelPatch };
              }
            }

            if (patch) {
              const layoutPatch = getPatchByLayouts(shapeComposite, { update: patch });
              // Discard layout patch for the target label
              // => The layout logic doesn't work well with this state when the state changes both position and alignments of the label.
              // => This case happens because this state updates both of them as single patch and accumulates tmp patches.
              patch = { ...layoutPatch, [labelShape.id]: patch[labelShape.id] };
            }
          } else {
            const d = sub(event.data.current, event.data.startAbs);
            const affineSrc: AffineMatrix = [1, 0, 0, 1, d.x, d.y];
            patch = { [labelShape.id]: shapeComposite.transformShape(labelShape, affineSrc) };

            // Inherit the latest alignment in this state
            const tmpPatch = shapeComposite.tmpShapeMap[labelShape.id] as Partial<TextShape>;
            if (tmpPatch?.vAlign) {
              patch[labelShape.id].vAlign = tmpPatch.vAlign;
            }
            if (tmpPatch?.hAlign) {
              patch[labelShape.id].hAlign = tmpPatch.hAlign;
            }
            patch = getPatchByLayouts(shapeComposite, { update: patch });
          }

          if (!patch) {
            ctx.setTmpShapeMap({});
            affine = IDENTITY_AFFINE;
            return;
          }

          ctx.setTmpShapeMap(patch);
          // Save final transition as current affine
          const updated = patch[labelShape.id];
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
          return ctx.states.newSelectionHubState;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const tmpShape = ctx.getTmpShapeMap()[labelShape.id] ?? {};
      renderParentLineRelation(ctx, renderCtx, { ...labelShape, ...tmpShape }, parentLineShape);
      boundingBox.renderResizedBounding(renderCtx, ctx.getStyleScheme(), ctx.getScale(), affine);
    },
  };
}
