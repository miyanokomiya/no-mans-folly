import type { AppCanvasState } from "./core";
import { IDENTITY_AFFINE, IRectangle, add, moveRect, sub } from "okageo";
import { Shape } from "../../../models";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { resizeShape } from "../../../shapes";
import * as geometry from "../../../utils/geometry";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import {
  ConnectedLineHandler,
  getConnectedLineInfoMap,
  newConnectedLineHandler,
  renderPatchedVertices,
} from "../../connectedLineHandler";
import { mergeMap } from "../../../utils/commons";
import { LineShape, isLineShape } from "../../../shapes/line";
import { LineLabelHandler, newLineLabelHandler } from "../../lineLabelHandler";
import { isLineLabelShape } from "../../../shapes/text";
import { newSelectionHubState } from "./selectionHubState";
import { COMMAND_EXAM_SRC } from "./commandExams";
import { getPatchByPointerUpOutsideLayout, handlePointerMoveOnLayout } from "./movingShapeLayoutHandler";

interface Option {
  boundingBox?: BoundingBox;
}

export function newMovingShapeState(option?: Option): AppCanvasState {
  let shapeSnapping: ShapeSnapping;
  let movingRect: IRectangle;
  let boundingBox: BoundingBox;
  let snappingResult: SnappingResult | undefined;
  let affine = IDENTITY_AFFINE;
  let lineHandler: ConnectedLineHandler;
  let lineLabelHandler: LineLabelHandler;
  let linePatchedMap: { [id: string]: Partial<LineShape> };
  let targetIds: string[];

  return {
    getLabel: () => "MovingShape",
    onStart: (ctx) => {
      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const targets = ctx.getShapeComposite().getAllTransformTargets(Object.keys(ctx.getSelectedShapeIdMap()));
      if (targets.length === 0) return newSelectionHubState;

      targetIds = targets.map((s) => s.id);
      const targetIdSet = new Set(targetIds);

      // Line labels should be moved via dedicated state
      targetIds = targetIds.filter((id) => {
        const shape = shapeMap[id];
        return !isLineLabelShape(shape);
      });

      ctx.startDragging();
      ctx.setCursor("move");
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_SNAP]);

      const snappableShapes = shapeComposite.getShapesOverlappingRect(
        Object.values(shapeMap).filter((s) => !targetIdSet.has(s.id) && !isLineShape(s)),
        ctx.getViewRect(),
      );
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });
      movingRect = geometry.getWrapperRect(targetIds.map((id) => shapeComposite.getWrapperRect(shapeMap[id])));

      if (option?.boundingBox) {
        boundingBox = option.boundingBox;
      } else {
        const shapeRects = targetIds.map((id) => shapeMap[id]).map((s) => shapeComposite.getWrapperRect(s));

        boundingBox = newBoundingBox({
          path: geometry.getRectPoints(geometry.getWrapperRect(shapeRects)),
        });
      }

      lineHandler = newConnectedLineHandler({
        connectedLinesMap: getConnectedLineInfoMap(ctx, targetIds),
        ctx,
      });

      lineLabelHandler = newLineLabelHandler({ ctx });
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
          const onLayoutResult = handlePointerMoveOnLayout(ctx, event, targetIds, option);
          if (onLayoutResult) return onLayoutResult;

          const d = sub(event.data.current, event.data.start);
          snappingResult = event.data.ctrl ? undefined : shapeSnapping.test(moveRect(movingRect, d));
          const translate = snappingResult ? add(d, snappingResult.diff) : d;
          affine = [1, 0, 0, 1, translate.x, translate.y];

          const shapeMap = ctx.getShapeComposite().shapeMap;
          const patchMap = targetIds.reduce<{ [id: string]: Partial<Shape> }>((m, id) => {
            const s = shapeMap[id];
            if (s) m[id] = resizeShape(ctx.getShapeStruct, s, affine);
            return m;
          }, {});

          linePatchedMap = lineHandler.onModified(patchMap);
          const merged = mergeMap(patchMap, linePatchedMap);
          const labelPatch = lineLabelHandler.onModified(merged);
          ctx.setTmpShapeMap(mergeMap(merged, labelPatch));
          return;
        }
        case "pointerup": {
          const val = ctx.getTmpShapeMap();

          if (Object.keys(val).length > 0) {
            ctx.patchShapes(getPatchByPointerUpOutsideLayout(ctx, val));
          }
          return () => newSelectionHubState({ boundingBox: boundingBox.getTransformedBoundingBox(affine) });
        }
        case "selection": {
          return newSelectionHubState;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      boundingBox.render(renderCtx, ctx.getStyleScheme(), ctx.getScale());
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
