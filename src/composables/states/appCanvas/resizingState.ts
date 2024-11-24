import type { AppCanvasState } from "./core";
import {
  BoundingBox,
  BoundingBoxResizing,
  HitResult,
  getMovingBoundingBoxPoints,
  newBoundingBoxResizing,
} from "../../boundingBox";
import { AffineMatrix, IDENTITY_AFFINE, sub } from "okageo";
import { getTextRangeRect, resizeOnTextEdit, shouldKeepAspect, shouldResizeOnTextEdit } from "../../../shapes";
import { Shape } from "../../../models";
import {
  ShapeSnapping,
  SnappingResult,
  getSnappingResultForBoundingBoxResizing,
  newShapeSnapping,
  renderSnappingResult,
} from "../../shapeSnapping";
import { ConnectionRenderer, getConnectedLineInfoMap, newConnectionRenderer } from "../../connectedLineHandler";
import { patchPipe, toMap } from "../../../utils/commons";
import { COMMAND_EXAM_SRC } from "./commandExams";
import { TextShape } from "../../../shapes/text";
import { DocDelta } from "../../../models/document";
import { calcOriginalDocSize, getDeltaByScaleTextSize } from "../../../utils/textEditor";
import { applyPath } from "../../../utils/renderer";
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { getPatchByLayouts } from "../../shapeLayoutHandler";
import { resizeShapeTrees } from "../../shapeResizing";
import { getTree } from "../../../utils/tree";
import { getSnappableCandidates } from "./commons";

interface Option {
  boundingBox: BoundingBox;
  hitResult: HitResult;
  // Set this option to implement exclusive resizing result with conventional resizing behavior.
  resizeFn?: (targetMap: { [id: string]: Shape }, affine: AffineMatrix) => { [id: string]: Partial<Shape> };
}

export function newResizingState(option: Option): AppCanvasState {
  let targetShapeMap: { [id: string]: Shape };
  let resizingAffine = IDENTITY_AFFINE;
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;
  let boundingBoxResizing: BoundingBoxResizing;
  let connectionRenderer: ConnectionRenderer;

  return {
    getLabel: () => "Resizing",
    onStart: (ctx) => {
      ctx.startDragging();

      const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
      const targets = ctx.getShapeComposite().getAllTransformTargets(selectedIds, true);
      targetShapeMap = toMap(targets);
      const directlySelectedTargets = selectedIds.map((id) => targetShapeMap[id]);

      const shapeComposite = ctx.getShapeComposite();
      const snappableCandidates = getSnappableCandidates(
        ctx,
        targets.map((s) => s.id),
      );
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableCandidates.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        gridSnapping: ctx.getGrid().getSnappingLines(),
        settings: ctx.getUserSetting(),
      });

      boundingBoxResizing = newBoundingBoxResizing({
        rotation: option.boundingBox.getRotation(),
        hitResult: option.hitResult,
        resizingBase: option.boundingBox.getResizingBase(option.hitResult),
        // Only directly selected shapes should be resized via special modes.
        // => Otherwise, they won't go with group resizing.
        mode: directlySelectedTargets.some((s) => shouldKeepAspect(shapeComposite.getShapeStruct, s))
          ? "keepAspect"
          : directlySelectedTargets.some((s) => shouldResizeOnTextEdit(shapeComposite.getShapeStruct, s))
            ? "text"
            : undefined,
      });

      const targetIds = targets.map((s) => s.id);
      const connectedLinesMap = getConnectedLineInfoMap(ctx, targetIds);
      connectionRenderer = newConnectionRenderer({
        connectedLinesMap,
        excludeIdSet: new Set(targetIds),
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
          const keepAspect = event.data.shift;
          const centralize = event.data.alt;
          const diff = sub(event.data.current, event.data.start);
          const boundingBoxPath = getMovingBoundingBoxPoints(option.boundingBox.path, option.hitResult);
          if (event.data.ctrl) {
            resizingAffine = boundingBoxResizing.getAffine(diff, { keepAspect, centralize });
            snappingResult = undefined;
          } else {
            const snappingInfo = getSnappingResultForBoundingBoxResizing(
              boundingBoxResizing,
              shapeSnapping,
              boundingBoxPath,
              diff,
              { keepAspect, centralize },
              ctx.getScale(),
            );
            resizingAffine = snappingInfo.resizingAffine;
            snappingResult = snappingInfo.snappingResult;
          }

          const selectedIdMap = ctx.getSelectedShapeIdMap();
          const shapeComposite = ctx.getShapeComposite();
          const shapeMap = shapeComposite.shapeMap;
          const docMap = ctx.getDocumentMap();
          const docPatch: { [id: string]: DocDelta } = {};
          const patchResult = patchPipe(
            [
              () => {
                if (option?.resizeFn) {
                  return option.resizeFn(targetShapeMap, resizingAffine);
                }

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
                  // Only directly selected shapes can be the targets of this adjustment unless "keepAspect" is true.
                  if (!selectedIdMap[id] && !keepAspect) return;

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
            ctx.states.newSelectionHubState({
              boundingBox: option.boundingBox.getTransformedBoundingBox(resizingAffine),
            });
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();
      const shapeComposite = ctx.getShapeComposite();
      const shapes = Object.entries(shapeComposite.mergedShapeMap)
        .filter(([id]) => targetShapeMap[id])
        .map(([, s]) => s);

      applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * scale });
      renderCtx.beginPath();
      shapes.forEach((s) => applyPath(renderCtx, shapeComposite.getLocalRectPolygon(s), true));
      renderCtx.stroke();
      option.boundingBox.renderResizedBounding(renderCtx, ctx.getStyleScheme(), scale, resizingAffine);

      if (snappingResult) {
        const shapeComposite = ctx.getShapeComposite();
        const shapeMap = shapeComposite.shapeMap;
        renderSnappingResult(renderCtx, {
          style,
          scale,
          result: snappingResult,
          getTargetRect: (id) => shapeComposite.getWrapperRect(shapeMap[id]),
        });
      }

      connectionRenderer.render(renderCtx, ctx.getTmpShapeMap(), style, scale);
    },
  };
}
