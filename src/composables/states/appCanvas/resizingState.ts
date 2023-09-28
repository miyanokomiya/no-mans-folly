import type { AppCanvasState } from "./core";
import { BoundingBox, HitResult, getMovingBoundingBoxPoints, newBoundingBoxResizing } from "../../boundingBox";
import { IDENTITY_AFFINE, IVec2, add, applyAffine, getNorm, sub } from "okageo";
import { filterShapesOverlappingRect, getSnappingLines, getWrapperRect, resizeShape } from "../../../shapes";
import { Shape } from "../../../models";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import {
  ConnectedLineHandler,
  getConnectedLineInfoMap,
  newConnectedLineHandler,
  renderPatchedVertices,
} from "../../connectedLineHandler";
import { mergeMap } from "../../../utils/commons";
import { LineShape, isLineShape } from "../../../shapes/line";
import { LineLabelHandler, newLineLabelHandler } from "../../lineLabelHandler";
import { newSelectionHubState } from "./selectionHubState";
import { COMMAND_EXAM_SRC } from "./commandExams";

interface Option {
  boundingBox: BoundingBox;
  hitResult: HitResult;
}

export function newResizingState(option: Option): AppCanvasState {
  let selectedIds: { [id: string]: true };
  let resizingAffine = IDENTITY_AFFINE;
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;
  let lineHandler: ConnectedLineHandler;
  let lineLabelHandler: LineLabelHandler;
  let linePatchedMap: { [id: string]: Partial<LineShape> };

  const boundingBoxResizing = newBoundingBoxResizing({
    rotation: option.boundingBox.getRotation(),
    hitResult: option.hitResult,
    resizingBase: option.boundingBox.getResizingBase(option.hitResult),
  });

  return {
    getLabel: () => "Resizing",
    onStart: (ctx) => {
      selectedIds = ctx.getSelectedShapeIdMap();
      ctx.startDragging();

      const shapeMap = ctx.getShapeMap();
      const snappableShapes = filterShapesOverlappingRect(
        ctx.getShapeStruct,
        Object.values(shapeMap).filter((s) => !selectedIds[s.id] && !isLineShape(s)),
        ctx.getViewRect()
      );
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, getSnappingLines(ctx.getShapeStruct, s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });

      lineHandler = newConnectedLineHandler({
        connectedLinesMap: getConnectedLineInfoMap(ctx),
        ctx,
      });

      lineLabelHandler = newLineLabelHandler({ ctx });

      ctx.setCommandExams([
        COMMAND_EXAM_SRC.DISABLE_SNAP,
        COMMAND_EXAM_SRC.RESIZE_PROPORTIONALLY,
        COMMAND_EXAM_SRC.RESIZE_AT_CENTER,
      ]);
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
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
                })
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

          const shapeMap = ctx.getShapeMap();
          const patchMap = Object.keys(selectedIds).reduce<{ [id: string]: Partial<Shape> }>((m, id) => {
            const shape = shapeMap[id];
            if (shape) {
              m[id] = resizeShape(ctx.getShapeStruct, shape, resizingAffine);
            }
            return m;
          }, {});

          linePatchedMap = lineHandler.onModified(patchMap);
          const merged = mergeMap(patchMap, linePatchedMap);
          const labelPatch = lineLabelHandler.onModified(merged);
          ctx.setTmpShapeMap(mergeMap(merged, labelPatch));
          return;
        }
        case "pointerup": {
          ctx.patchShapes(ctx.getTmpShapeMap());
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
      option.boundingBox.render(renderCtx, resizingAffine);
      if (snappingResult) {
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
          getTargetRect: (id) => getWrapperRect(ctx.getShapeStruct, ctx.getShapeMap()[id]),
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
