import type { AppCanvasState, AppCanvasStateContext } from "./core";
import { IDENTITY_AFFINE, IRectangle, add, moveRect, sub } from "okageo";
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
import { applyStrokeStyle } from "../../../utils/strokeStyle";
import { handlePointerMoveOnLine } from "./movingShapeOnLineHandler";
import { getSnappableCandidates } from "./commons";
import { FrameShape } from "../../../shapes/frame";
import { getFrameShapeIdsInBranches, getRootShapeIdsByFrame } from "../../frame";
import { ModifierOptions } from "../../../utils/devices";
import { newCacheWithArg } from "../../../utils/stateful/cache";
import { handleCommonWheel } from "../commons";
import { isLineShape } from "../../../shapes/line";

interface Option extends ModifierOptions {
  boundingBox?: BoundingBox;
}

export function newMovingShapeState(option?: Option): AppCanvasState {
  let movingRect: IRectangle;
  let movingRectSub: IRectangle | undefined;
  let boundingBox: BoundingBox;
  let snappingResult: SnappingResult | undefined;
  let affine = IDENTITY_AFFINE;
  let lineHandler: ConnectedLineDetouchHandler;
  let targetIds: string[];
  let connectionRenderer: ConnectionRenderer;
  let beforeMove = true;
  let indexShapeId: string | undefined;

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
      indexShapeId = movingShapeSub?.id ?? ctx.getLastSelectedShapeId();

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

      // When multiple shapes are selected, use the bounds of the index shape as snapping source.
      if (targetRootIds.length > 1 && indexShapeId) {
        movingRectSub = shapeComposite.getWrapperRect(shapeMap[indexShapeId]);
      }

      if (option?.boundingBox) {
        boundingBox = option.boundingBox;
      } else {
        boundingBox = newBoundingBox({
          path: geometry.getRectPoints(movingRect),
        });
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

          snappingResult = event.data.ctrl
            ? undefined
            : (snappingResult = snappingCache
                .getValue(ctx)
                .testWithSubRect(
                  moveRect(movingRect, d),
                  movingRectSub ? moveRect(movingRectSub, d) : undefined,
                  undefined,
                  ctx.getScale(),
                ));

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
      applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: style.selectionLineWidth * scale });
      renderCtx.beginPath();
      renderCtx.strokeRect(movingRect.x + affine[4], movingRect.y + affine[5], movingRect.width, movingRect.height);

      if (snappingResult) {
        const shapeMap = shapeComposite.mergedShapeMap;
        renderSnappingResult(renderCtx, {
          style,
          scale,
          result: snappingResult,
          getTargetRect: (id) => (shapeMap[id] ? shapeComposite.getWrapperRect(shapeMap[id]) : undefined),
        });
      }

      connectionRenderer.render(renderCtx, ctx.getTmpShapeMap(), style, scale);
    },
  };
}
