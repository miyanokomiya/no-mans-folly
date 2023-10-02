import type { AppCanvasState } from "./core";
import { IDENTITY_AFFINE, IRectangle, add, moveRect, sub } from "okageo";
import { Shape } from "../../../models";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { filterShapesOverlappingRect, getSnappingLines, getWrapperRect, resizeShape } from "../../../shapes";
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
      const shapeMap = ctx.getShapeComposite().shapeMap;
      const targets = ctx.getShapeComposite().getAllTransformTargets(Object.keys(ctx.getSelectedShapeIdMap()));
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

      const snappableShapes = filterShapesOverlappingRect(
        ctx.getShapeStruct,
        Object.values(shapeMap).filter((s) => !targetIdSet.has(s.id) && !isLineShape(s)),
        ctx.getViewRect()
      );
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, getSnappingLines(ctx.getShapeStruct, s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });
      movingRect = geometry.getWrapperRect(targetIds.map((id) => getWrapperRect(ctx.getShapeStruct, shapeMap[id])));

      if (option?.boundingBox) {
        boundingBox = option.boundingBox;
      } else {
        const shapeRects = targetIds.map((id) => shapeMap[id]).map((s) => getWrapperRect(ctx.getShapeStruct, s));

        boundingBox = newBoundingBox({
          path: geometry.getRectPoints(geometry.getWrapperRect(shapeRects)),
          styleScheme: ctx.getStyleScheme(),
          scale: ctx.getScale(),
        });
      }

      lineHandler = newConnectedLineHandler({
        connectedLinesMap: getConnectedLineInfoMap(ctx),
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
      boundingBox.render(renderCtx, affine);
      if (snappingResult) {
        const shapeMap = ctx.getShapeMap();
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
          getTargetRect: (id) => getWrapperRect(ctx.getShapeStruct, shapeMap[id]),
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
