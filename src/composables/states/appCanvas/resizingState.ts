import type { AppCanvasState } from "./core";
import { translateOnSelection } from "./commons";
import { BoundingBox, HitResult, getMovingBoundingBoxPoints, newBoundingBoxResizing } from "../../boundingBox";
import { IDENTITY_AFFINE, add, applyAffine, sub } from "okageo";
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
  let linePatchedMap: { [id: string]: Partial<LineShape> };

  const boundingBoxResizing = newBoundingBoxResizing({
    rotation: option.boundingBox.getRotation(),
    hitResult: option.hitResult,
    resizingBase: option.boundingBox.getResizingBase(option.hitResult),
  });

  return {
    getLabel: () => "Resizing",
    onStart: async (ctx) => {
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
      });

      lineHandler = newConnectedLineHandler({
        connectedLinesMap: getConnectedLineInfoMap(ctx),
        ctx,
      });
    },
    onEnd: async (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const diff = sub(event.data.current, event.data.start);
          resizingAffine = boundingBoxResizing.getAffine(diff, {
            keepAspect: event.data.shift,
            centralize: event.data.alt,
          });

          const boundingBoxPath = getMovingBoundingBoxPoints(option.boundingBox.path, option.hitResult);
          const results = boundingBoxPath
            .map((p) => shapeSnapping.testPoint(applyAffine(resizingAffine, p)))
            .filter((r): r is SnappingResult => !!r);
          if (results.length > 0) {
            snappingResult = results[0];
          } else {
            snappingResult = undefined;
          }

          if (snappingResult) {
            const adjustedD = snappingResult ? add(diff, snappingResult.diff) : diff;

            resizingAffine = boundingBoxResizing.getAffineAfterSnapping(adjustedD, snappingResult.targets[0].line, {
              keepAspect: event.data.shift,
              centralize: event.data.alt,
            });

            // "keepAspect" mode needs recalculation to render control lines properly.
            // FIXME: It's not the optimal way.
            if (event.data.shift) {
              const results = boundingBoxPath
                .map((p) => shapeSnapping.testPoint(applyAffine(resizingAffine, p)))
                .filter((r): r is SnappingResult => !!r);
              if (results.length > 0) {
                snappingResult = results[0];
              }
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
          ctx.setTmpShapeMap(mergeMap(patchMap, linePatchedMap));
          return;
        }
        case "pointerup": {
          ctx.patchShapes(ctx.getTmpShapeMap());
          return translateOnSelection(ctx, option.boundingBox.getTransformedBoundingBox(resizingAffine));
        }
        case "selection": {
          return translateOnSelection(ctx);
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
