import type { AppCanvasState, AppCanvasStateContext } from "./core";
import { IDENTITY_AFFINE, IRectangle, IVec2, add, moveRect, sub } from "okageo";
import { Shape } from "../../../models";
import { SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import * as geometry from "../../../utils/geometry";
import { BoundingBox, newBoundingBox } from "../../boundingBox";
import {
  ConnectedLineDetouchHandler,
  ConnectionRenderer,
  getConnectedLineInfoMap,
  newConnectedLineDetouchHandler,
  newConnectionRenderer,
} from "../../connectedLineHandler";
import { COMMAND_EXAM_SRC } from "./commandExams";
import {
  getPatchByPointerUpOutsideLayout,
  handlePointerMoveOnLayout,
  handlePointerMoveOnFrameLayout,
} from "./movingShapeLayoutHandler";
import { getPatchAfterLayouts } from "../../shapeLayoutHandler";
import { isLineLabelShape } from "../../../shapes/utils/lineLabel";
import { mergeMap } from "../../../utils/commons";
import { handlePointerMoveOnLine } from "./movingShapeOnLineHandler";
import { getSnappableCandidates } from "./commons";
import { FrameShape } from "../../../shapes/frame";
import { getFrameShapeIdsInBranches, getRootShapeIdsByFrame } from "../../frame";
import { ModifierOptions } from "../../../utils/devices";
import { newCacheWithArg } from "../../../utils/stateful/cache";
import { handleCommonWheel } from "../commons";
import { isLineShape } from "../../../shapes/line";
import { renderMovingHighlight } from "./utils/highlight";

interface Option extends ModifierOptions {
  boundingBox?: BoundingBox;
}

export function newMovingShapeState(option?: Option): AppCanvasState {
  let movingRect: IRectangle;
  let movingRectSub: IRectangle | undefined;
  let movingOutlinePoints: IVec2[] | undefined;
  let movingOutlinePointsSub: IVec2[] | undefined;
  let boundingBox: BoundingBox;
  let snappingResult: SnappingResult | undefined;
  let affine = IDENTITY_AFFINE;
  let lineHandler: ConnectedLineDetouchHandler;
  let targetIds: string[];
  let connectionRenderer: ConnectionRenderer;
  let beforeMove = true;
  let indexShapeId: string;

  const snappingCache = newCacheWithArg((ctx: AppCanvasStateContext) => {
    const shapeComposite = ctx.getShapeComposite();
    const snappableCandidates = getSnappableCandidates(ctx, targetIds);
    return newShapeSnapping({
      shapeSnappingList: snappableCandidates.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
      gridSnapping: ctx.getGrid().getSnappingLines(),
      settings: ctx.getUserSetting(),
    });
  });

  return {
    getLabel: () => "MovingShape",
    onStart: (ctx) => {
      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());

      const movingIdSet = new Set(selectedIds);
      if (!option?.shift) {
        getFrameShapeIdsInBranches(shapeComposite, selectedIds).forEach((id) => {
          const s = shapeMap[id] as FrameShape;
          getRootShapeIdsByFrame(shapeComposite, s).forEach((id) => movingIdSet.add(id));
        });
      }
      const movingIds = Array.from(movingIdSet);

      const subShapeComposite = shapeComposite.getSubShapeComposite(movingIds, shapeComposite.tmpShapeMap);
      const movingShapeSub = subShapeComposite.findShapeAt(ctx.getCursorPoint(), undefined, [], false, ctx.getScale());
      indexShapeId = movingShapeSub?.id ?? ctx.getLastSelectedShapeId() ?? selectedIds[0];
      const indexShape = shapeMap[indexShapeId];

      targetIds = subShapeComposite.shapes.map((s) => s.id);
      if (targetIds.length === 0) return ctx.states.newSelectionHubState;

      // Line labels should be moved via dedicated state
      targetIds = targetIds.filter((id) => {
        const shape = shapeMap[id];
        return !isLineLabelShape(shapeComposite, shape);
      });

      ctx.startDragging();
      ctx.setCursor("move");
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_SNAP, COMMAND_EXAM_SRC.ATTACH_TO_LINE_TOGGLE]);

      const targetRootIds = subShapeComposite.mergedShapeTree.map((t) => t.id);
      movingRect = geometry.getWrapperRect(targetRootIds.map((id) => shapeComposite.getWrapperRect(shapeMap[id])));

      if (option?.boundingBox) {
        boundingBox = option.boundingBox;
      } else {
        boundingBox = newBoundingBox({
          path: geometry.getRectPoints(movingRect),
        });
      }

      // When multiple shapes are selected, use the index shape as snapping sub-source.
      if (targetRootIds.length > 1) {
        movingOutlinePoints = boundingBox.path;
        movingRectSub = shapeComposite.getWrapperRect(indexShape);
        movingOutlinePointsSub = shapeComposite.getSnappingFeaturePoints(indexShape);
      } else if (targetRootIds.length === 1) {
        movingOutlinePoints = shapeComposite.getSnappingFeaturePoints(shapeMap[targetRootIds[0]]);
      }

      const connectedLinesMap = getConnectedLineInfoMap(ctx, targetIds);
      lineHandler = newConnectedLineDetouchHandler({ ctx });
      connectionRenderer = newConnectionRenderer({
        connectedLinesMap,
        excludeIdSet: new Set(targetIds),
      });
    },
    onResume(ctx) {
      beforeMove = true;
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_SNAP, COMMAND_EXAM_SRC.ATTACH_TO_LINE_TOGGLE]);
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
          beforeMove = false;
          if (indexShapeId) {
            const onFrameLayoutResult = handlePointerMoveOnFrameLayout(ctx, event, targetIds, indexShapeId, option);
            if (onFrameLayoutResult) return onFrameLayoutResult;

            const onLayoutResult = handlePointerMoveOnLayout(ctx, event, targetIds, indexShapeId, option);
            if (onLayoutResult) return onLayoutResult;

            const onLineResult = handlePointerMoveOnLine(ctx, event, targetIds, indexShapeId);
            if (onLineResult) return onLineResult;
          }

          const d = sub(event.data.current, event.data.startAbs);

          const outlinePoints = movingOutlinePoints?.map((p) => add(p, d));
          const outlinePointsSub = movingOutlinePointsSub?.map((p) => add(p, d));
          snappingResult = event.data.ctrl
            ? undefined
            : snappingCache
                .getValue(ctx)
                .testWithSubRect(
                  { rect: moveRect(movingRect, d), outlinePoints },
                  movingRectSub ? { rect: moveRect(movingRectSub, d), outlinePoints: outlinePointsSub } : undefined,
                  ctx.getScale(),
                );

          const translate = snappingResult ? add(d, snappingResult.diff) : d;
          affine = [1, 0, 0, 1, translate.x, translate.y];

          const shapeComposite = ctx.getShapeComposite();
          const shapeMap = ctx.getShapeComposite().shapeMap;
          const targetIdSet = new Set(targetIds);
          let patchMap = targetIds.reduce<{ [id: string]: Partial<Shape> }>((m, id) => {
            const s = shapeMap[id];
            if (s) {
              m[id] = shapeComposite.transformShape(s, affine);
              // When the shape is attached to a line and attaching target isn't moving together, it should be detached.
              if (
                s.attachment &&
                !targetIdSet.has(s.attachment.id) &&
                shapeMap[s.attachment.id] &&
                isLineShape(shapeMap[s.attachment.id])
              )
                m[id].attachment = undefined;
            }
            return m;
          }, {});

          const linePatchedMap = lineHandler.onModified(patchMap);
          patchMap = getPatchAfterLayouts(shapeComposite, { update: mergeMap(patchMap, linePatchedMap) });
          ctx.setTmpShapeMap(patchMap);
          return;
        }
        case "pointerup": {
          const val = ctx.getTmpShapeMap();

          if (Object.keys(val).length > 0) {
            ctx.patchShapes(
              getPatchByPointerUpOutsideLayout(ctx.getShapeComposite(), val, Object.keys(ctx.getSelectedShapeIdMap())),
            );
          }
          return () => ctx.states.newSelectionHubState({ boundingBox: boundingBox.getTransformedBoundingBox(affine) });
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        case "keydown": {
          switch (event.data.key) {
            case "a": {
              ctx.patchUserSetting({ attachToLine: ctx.getUserSetting().attachToLine === "on" ? "off" : "on" });
              return;
            }
            case "Escape":
              return ctx.states.newSelectionHubState;
            case "g":
              if (event.data.shift) return;
              ctx.patchUserSetting({ grid: ctx.getGrid().disabled ? "on" : "off" });
              snappingCache.update();
              return;
            default:
              return;
          }
        }
        case "wheel":
          handleCommonWheel(ctx, event);
          snappingCache.update();
          return;
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      // Avoid rendering in this case to prevent flickering
      if (beforeMove) return;

      const shapeComposite = ctx.getShapeComposite();
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();

      const v = { x: affine[4], y: affine[5] };
      renderMovingHighlight(renderCtx, {
        style,
        scale,
        movingRect: moveRect(movingRect, v),
        movingOutline: movingOutlinePoints ? [{ path: movingOutlinePoints.map((p) => add(p, v)), curves: [] }] : [],
      });
      if (movingRectSub) {
        renderMovingHighlight(renderCtx, {
          style,
          scale,
          movingRect: moveRect(movingRectSub, { x: affine[4], y: affine[5] }),
          movingOutline: movingOutlinePointsSub
            ? [{ path: movingOutlinePointsSub.map((p) => add(p, v)), curves: [] }]
            : undefined,
        });
      }

      if (snappingResult) {
        const shapeMap = shapeComposite.mergedShapeMap;
        renderSnappingResult(renderCtx, {
          style,
          scale,
          result: snappingResult,
          getTargetShape: (id) =>
            shapeMap[id]
              ? {
                  highlightPaths: shapeComposite.getHighlightPaths(shapeMap[id]),
                  wrapperRect: shapeComposite.getWrapperRect(shapeMap[id]),
                }
              : undefined,
        });
      }

      connectionRenderer.render(renderCtx, ctx.getTmpShapeMap(), style, scale);
    },
  };
}
