import type { AppCanvasState } from "./core";
import {
  BoundingBox,
  BoundingBoxResizing,
  HitResult,
  getMovingBoundingBoxPoints,
  newBoundingBoxResizing,
} from "../../boundingBox";
import { IDENTITY_AFFINE, IVec2, add, applyAffine, getNorm, sub } from "okageo";
import { getTextRangeRect, resizeOnTextEdit, shouldKeepAspect, shouldResizeOnTextEdit } from "../../../shapes";
import { Shape } from "../../../models";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { renderPatchedVertices } from "../../connectedLineHandler";
import { patchPipe, toMap } from "../../../utils/commons";
import { LineShape, isLineShape } from "../../../shapes/line";
import { newSelectionHubState } from "./selectionHubState";
import { COMMAND_EXAM_SRC } from "./commandExams";
import { TextShape } from "../../../shapes/text";
import { DocDelta } from "../../../models/document";
import { calcOriginalDocSize, getDeltaByScaleTextSize } from "../../../utils/textEditor";
import { applyPath } from "../../../utils/renderer";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { getPatchByLayouts } from "../../shapeLayoutHandler";
import { resizeShapeTrees } from "../../shapeComposite";
import { getTree } from "../../../utils/tree";

interface Option {
  boundingBox: BoundingBox;
  hitResult: HitResult;
}

export function newResizingState(option: Option): AppCanvasState {
  let targetShapeMap: { [id: string]: Shape };
  let resizingAffine = IDENTITY_AFFINE;
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;
  let linePatchedMap: { [id: string]: Partial<LineShape> };
  let boundingBoxResizing: BoundingBoxResizing;

  return {
    getLabel: () => "Resizing",
    onStart: (ctx) => {
      const targets = ctx.getShapeComposite().getAllTransformTargets(Object.keys(ctx.getSelectedShapeIdMap()), true);
      targetShapeMap = toMap(targets);
      ctx.startDragging();

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const snappableShapes = shapeComposite.getShapesOverlappingRect(
        Object.values(shapeMap).filter((s) => !targetShapeMap[s.id] && !isLineShape(s)),
        ctx.getViewRect(),
      );
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });

      boundingBoxResizing = newBoundingBoxResizing({
        rotation: option.boundingBox.getRotation(),
        hitResult: option.hitResult,
        resizingBase: option.boundingBox.getResizingBase(option.hitResult),
        mode: targets.some((s) => shouldKeepAspect(shapeComposite.getShapeStruct, s))
          ? "keepAspect"
          : targets.some((s) => shouldResizeOnTextEdit(shapeComposite.getShapeStruct, s))
            ? "text"
            : undefined,
      });

      ctx.setCommandExams([
        COMMAND_EXAM_SRC.DISABLE_SNAP,
        COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY,
        COMMAND_EXAM_SRC.RESIZE_AT_CENTER,
      ]);
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
      ctx.setTmpDocMap({});
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const diff = sub(event.data.current, event.data.start);

          // Apply plain resizing
          resizingAffine = boundingBoxResizing.getAffine(diff, {
            keepAspect: event.data.shift,
            centralize: event.data.alt,
          });

          // Let resized bounding box snap to shapes.
          const boundingBoxPath = getMovingBoundingBoxPoints(option.boundingBox.path, option.hitResult);
          const snappingResults = event.data.ctrl
            ? []
            : boundingBoxPath
                .map((p) => shapeSnapping.testPoint(applyAffine(resizingAffine, p)))
                .filter((r): r is SnappingResult => !!r)
                .sort((a, b) => getNorm(a.diff) - getNorm(b.diff));

          if (snappingResults.length > 0) {
            snappingResult = snappingResults[0];
          } else {
            snappingResult = undefined;
          }

          if (snappingResult) {
            const adjustedD = snappingResult ? add(diff, snappingResult.diff) : diff;
            const movingPointInfoList: [IVec2, IVec2][] = boundingBoxPath.map((p) => [
              p,
              applyAffine(resizingAffine, p),
            ]);

            // Apply resizing restriction to each snapping candidate
            const results = snappingResult.targets
              .map((target) =>
                boundingBoxResizing.getAffineAfterSnapping(adjustedD, movingPointInfoList, target.line, {
                  keepAspect: event.data.shift,
                  centralize: event.data.alt,
                }),
              )
              .filter((r) => r[1] <= shapeSnapping.snapThreshold * 2)
              .sort((a, b) => a[1] - b[1]);

            if (results.length > 0) {
              const result = results[0];
              resizingAffine = result[0];

              if (result[2]) {
                // Pick exact target when it's determined.
                snappingResult = {
                  ...snappingResult,
                  targets: snappingResult.targets.filter((t) => t.line == result[2]),
                };
              } else if (resizingAffine) {
                // Need recalculation to get final control lines.
                const results = boundingBoxPath
                  .map((p) => shapeSnapping.testPoint(applyAffine(resizingAffine, p)))
                  .filter((r): r is SnappingResult => !!r)
                  .sort((a, b) => getNorm(a.diff) - getNorm(b.diff));
                if (results.length > 0) {
                  snappingResult = results[0];
                }
              }
            } else {
              // No snapping result satisfies the resizing restriction or close enough to the cursor.
              snappingResult = undefined;
            }
          }

          const shapeComposite = ctx.getShapeComposite();
          const shapeMap = shapeComposite.shapeMap;
          const docMap = ctx.getDocumentMap();
          const docPatch: { [id: string]: DocDelta } = {};
          const patchResult = patchPipe(
            [
              (_current) => {
                const trees = getTree(Object.values(targetShapeMap));
                return resizeShapeTrees(
                  shapeComposite,
                  trees.map((t) => t.id),
                  resizingAffine,
                );
              },
              (patchedSrc, patch) => {
                // Scale each text size along with height scaling
                Object.keys(patch).forEach((id) => {
                  const src = shapeMap[id];
                  const shapeDoc = docMap[id];
                  if (!shapeDoc || !shouldResizeOnTextEdit(shapeComposite.getShapeStruct, src)) return;

                  const srcTextRect = getTextRangeRect(shapeComposite.getShapeStruct, src)!;
                  const patchedTextRect = getTextRangeRect(shapeComposite.getShapeStruct, patchedSrc[id])!;
                  if (patchedTextRect.height === srcTextRect.height) return;

                  const heightScale = patchedTextRect.height / srcTextRect.height;
                  docPatch[id] = getDeltaByScaleTextSize(shapeDoc, heightScale, true);
                });
                return {};
              },
              (current, patch) => {
                // Adjust each text shape's size along with its content
                const shapePatch: { [id: string]: Partial<TextShape> } = {};
                const renderCtx = ctx.getRenderCtx();
                if (renderCtx) {
                  Object.keys(patch).forEach((id) => {
                    const shape = current[id];
                    const resizeOnTextEditInfo = shouldResizeOnTextEdit(shapeComposite.getShapeStruct, shape);
                    if (resizeOnTextEditInfo?.maxWidth) {
                      const nextDoc = docPatch[id] ? ctx.patchDocDryRun(id, docPatch[id]) : docMap[id];
                      const size = calcOriginalDocSize(nextDoc, renderCtx, resizeOnTextEditInfo.maxWidth);
                      const update = resizeOnTextEdit(shapeComposite.getShapeStruct, shape, size);
                      if (update) {
                        shapePatch[id] = update;
                      }
                    }
                  });
                }
                return shapePatch;
              },
            ],
            shapeMap,
          );

          ctx.setTmpShapeMap(getPatchByLayouts(shapeComposite, { update: patchResult.patch }));
          ctx.setTmpDocMap(docPatch);
          return;
        }
        case "pointerup": {
          const patch = getPatchByLayouts(ctx.getShapeComposite(), { update: ctx.getTmpShapeMap() });
          ctx.patchDocuments(ctx.getTmpDocMap(), patch);
          return () =>
            newSelectionHubState({ boundingBox: option.boundingBox.getTransformedBoundingBox(resizingAffine) });
        }
        case "selection": {
          return newSelectionHubState;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const shapeComposite = ctx.getShapeComposite();
      const shapes = Object.entries(shapeComposite.mergedShapeMap)
        .filter(([id]) => targetShapeMap[id])
        .map(([, s]) => s);

      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * ctx.getScale() });
      renderCtx.beginPath();
      shapes.forEach((s) => applyPath(renderCtx, shapeComposite.getLocalRectPolygon(s), true));
      renderCtx.stroke();
      option.boundingBox.renderResizedBounding(renderCtx, ctx.getStyleScheme(), ctx.getScale(), resizingAffine);

      if (snappingResult) {
        const shapeComposite = ctx.getShapeComposite();
        const shapeMap = shapeComposite.shapeMap;
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
          getTargetRect: (id) => shapeComposite.getWrapperRect(shapeMap[id]),
        });
      }

      if (linePatchedMap) {
        renderPatchedVertices(renderCtx, {
          lines: Object.values(linePatchedMap),
          scale: ctx.getScale(),
          style: ctx.getStyleScheme(),
        });
      }
    },
  };
}
