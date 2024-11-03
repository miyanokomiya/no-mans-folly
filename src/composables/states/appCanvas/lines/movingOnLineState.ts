import type { AppCanvasState } from "../core";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { fillArray, mapReduce, patchPipe, pickMinItem, splitList, toList, toMap } from "../../../../utils/commons";
import { getLinePath, isLineShape, LineShape } from "../../../../shapes/line";
import { getClosestOutlineInfoOfLine, getLineEdgeInfo } from "../../../../shapes/utils/line";
import { TAU } from "../../../../utils/geometry";
import { add, clamp, getDistanceSq, isSame, IVec2, lerpPoint, sub } from "okageo";
import { getAttachmentAnchorPoint } from "../../../lineAttachmentHandler";
import { Shape, ShapeAttachment } from "../../../../models";
import { applyCurvePath } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { newMovingAnchorOnLineState } from "./movingAnchorOnLineState";

type Option = {
  lineId: string;
  shapeId: string;
};

/**
 * This state is intended to be stacked up on "MovingShape" state.
 */
export function newMovingOnLineState(option: Option): AppCanvasState {
  let keepMoving = false;
  let lineAnchor: IVec2 | undefined;
  let line: LineShape;
  let edgeInfo: ReturnType<typeof getLineEdgeInfo>;

  return {
    getLabel: () => "MovingOnLine",
    onStart: (ctx) => {
      ctx.setCommandExams([
        COMMAND_EXAM_SRC.DISABLE_SNAP,
        COMMAND_EXAM_SRC.EVENLY_SPACED,
        COMMAND_EXAM_SRC.SLIDE_ATTACH_ANCHOR,
      ]);

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      line = shapeMap[option.lineId] as LineShape;
      if (!isLineShape(line)) {
        keepMoving = true;
        return { type: "break" };
      }

      edgeInfo = getLineEdgeInfo(line);
    },
    onResume: (ctx) => {
      ctx.setCommandExams([
        COMMAND_EXAM_SRC.DISABLE_SNAP,
        COMMAND_EXAM_SRC.EVENLY_SPACED,
        COMMAND_EXAM_SRC.SLIDE_ATTACH_ANCHOR,
      ]);
    },
    onEnd: (ctx) => {
      ctx.setCommandExams();

      if (keepMoving) {
        ctx.setTmpShapeMap(mapReduce(ctx.getTmpShapeMap(), (patch) => ({ ...patch, attachment: undefined })));
      } else {
        ctx.setTmpShapeMap({});
      }
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          if (event.data.ctrl) {
            keepMoving = true;
            return { type: "break" };
          }

          const shapeComposite = ctx.getShapeComposite();
          const shapeMap = shapeComposite.shapeMap;

          const indexShape = shapeMap[option.shapeId];
          const latestShape = shapeComposite.mergedShapeMap[indexShape.id];
          const indexAnchorP = getAttachmentAnchorPoint(
            shapeComposite,
            latestShape.attachment ? { ...indexShape, attachment: latestShape.attachment } : indexShape,
          );

          const diff = sub(event.data.current, event.data.start);
          const movedIndexAnchorP = add(indexAnchorP, diff);

          if (event.data.alt) {
            if (shapeComposite.attached(latestShape)) {
              return { type: "stack-resume", getState: () => newMovingAnchorOnLineState(option) };
            }
          }

          const closestInfo = getClosestOutlineInfoOfLine(line, movedIndexAnchorP, 40 * ctx.getScale());
          if (!closestInfo) {
            keepMoving = true;
            return { type: "break" };
          }

          const selectedShapeMap = mapReduce(ctx.getSelectedShapeIdMap(), (_, id) => shapeMap[id]);
          const selectedShapes = toList(selectedShapeMap);
          let attachInfoMap: Map<string, [to: IVec2]>;

          if (event.data.shift) {
            const attachInfo = getEvenlySpacedLineAttachment(
              shapeComposite.shapeMap,
              line.id,
              Object.keys(selectedShapeMap),
              indexShape.id,
              movedIndexAnchorP,
              edgeInfo,
            );
            attachInfoMap = attachInfo.attachInfoMap;
            lineAnchor = attachInfo.attachedPoint;
          } else {
            const baseTo = { x: closestInfo[1], y: 0 };
            const baseToP = closestInfo[0];
            lineAnchor = baseToP;
            attachInfoMap = new Map<string, [to: IVec2]>([[option.shapeId, [baseTo]]]);

            if (selectedShapes.length > 1) {
              const infoMap = getEvenlySpacedLineAttachmentBetweenFixedOnes(
                shapeComposite.shapeMap,
                line.id,
                Object.keys(selectedShapeMap),
                indexShape.id,
                baseTo,
              );
              for (const [k, v] of infoMap) {
                attachInfoMap.set(k, v);
              }
            }
          }

          const patch = patchPipe(
            [
              (src) => {
                return mapReduce(src, (s) => {
                  const info = attachInfoMap.get(s.id)!;
                  const attachment: ShapeAttachment = {
                    anchor: { x: 0.5, y: 0.5 },
                    rotationType: "relative",
                    rotation: 0,
                    // Inherit both source and temporary attachment to preserve attachment state as much as possible.
                    // => Attachment can be deleted in temporary data so "mergedShapeMap" doesn't work for this purpose.
                    ...shapeComposite.shapeMap[s.id].attachment,
                    ...shapeComposite.tmpShapeMap[s.id]?.attachment,
                    id: line.id,
                    to: info[0],
                  };
                  return { attachment };
                });
              },
              (_, currentPatch) => {
                return getPatchAfterLayouts(shapeComposite, { update: currentPatch });
              },
            ],
            toMap(Array.from(attachInfoMap.keys()).map((id) => shapeMap[id])),
          );
          ctx.setTmpShapeMap(patch.patch);

          return;
        }
        case "pointerup": {
          if (event.data.options.ctrl) return ctx.states.newSelectionHubState;

          ctx.patchShapes(ctx.getTmpShapeMap());
          return ctx.states.newSelectionHubState;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        case "shape-updated": {
          if (event.data.keys.has(line.id)) {
            return ctx.states.newSelectionHubState;
          }
          break;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      const scale = ctx.getScale();

      if (lineAnchor) {
        applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: 2 * scale });
        renderCtx.beginPath();
        applyCurvePath(renderCtx, getLinePath(line), line.curves);
        renderCtx.stroke();

        applyFillStyle(renderCtx, { color: style.selectionSecondaly });
        renderCtx.beginPath();
        renderCtx.arc(lineAnchor.x, lineAnchor.y, 6 * scale, 0, TAU);
        renderCtx.fill();
      }
    },
  };
}

function getEvenlySpacedLineAttachment(
  shapeMap: { [id: string]: Shape },
  lineId: string,
  selectedShapeIds: string[],
  indexShapeId: string,
  anchorP: IVec2,
  edgeInfo: ReturnType<typeof getLineEdgeInfo>,
): {
  attachInfoMap: Map<string, [to: IVec2]>;
  attachedPoint: IVec2;
} {
  const line = shapeMap[lineId] as LineShape;
  const movingTargetIdSet = new Set(selectedShapeIds);
  const allTargetIdSet = new Set(movingTargetIdSet);
  const fixedTargetIdSet = new Set<string>();
  toList(shapeMap).forEach((s) => {
    if (s.attachment?.id === line.id && !movingTargetIdSet.has(s.id)) {
      allTargetIdSet.add(s.id);
      fixedTargetIdSet.add(s.id);
    }
  });

  const closed = isSame(line.p, line.q);
  const splitSize = closed ? allTargetIdSet.size : Math.max(1, allTargetIdSet.size - 1);
  const points = fillArray(allTargetIdSet.size, 0).map<[IVec2, rate: number, index: number, distanceSq: number]>(
    (_, i) => {
      const t = i / splitSize;
      const p = edgeInfo.lerpFn(t);
      const dd = getDistanceSq(p, anchorP);
      return [p, t, i, dd];
    },
  );

  const movingIndex = selectedShapeIds.findIndex((id) => id === indexShapeId);
  const closestCandidates = points.filter((_, i) => movingIndex <= i && i <= points.length - movingTargetIdSet.size);
  const closestSplitInfo = pickMinItem(closestCandidates, (v) => v[3])!;

  const baseTo = { x: closestSplitInfo[1], y: 0 };
  const attachInfoMap = new Map<string, [to: IVec2]>([[indexShapeId, [baseTo]]]);

  const movingIndexRange: [from: number, to: number] = [closestSplitInfo[2], closestSplitInfo[2]];
  if (movingTargetIdSet.size > 1) {
    const [movingPrev, movingAfter] = splitList(
      Array.from(movingTargetIdSet)
        .filter((id) => id !== indexShapeId)
        .map((id) => shapeMap[id])
        .sort((a, b) => (a.attachment?.to.x ?? 1) - (b.attachment?.to.x ?? 1)),
      (s) => (s.attachment?.to.x ?? 1) <= baseTo.x,
    );
    console.log(points.length, movingPrev.length, movingAfter.length, closestSplitInfo[2]);
    movingPrev.forEach((s, i) => {
      const index = i + closestSplitInfo[2] - movingPrev.length;
      console.log(i, index);
      // const index = Math.max(0, i + closestSplitInfo[2] - prev.length);
      const info = points[index];
      attachInfoMap.set(s.id, [{ x: info[1], y: 0 }]);
      movingIndexRange[0] = Math.min(movingIndexRange[0], info[2]);
    });
    movingAfter.forEach((s, i) => {
      const info = points[i + closestSplitInfo[2] + 1];
      attachInfoMap.set(s.id, [{ x: info[1], y: 0 }]);
      movingIndexRange[1] = Math.max(movingIndexRange[1], info[2]);
    });
  }

  if (fixedTargetIdSet.size > 1) {
    const [prev, after] = splitList(
      Array.from(fixedTargetIdSet)
        .map((id) => shapeMap[id])
        .sort((a, b) => a.attachment!.to.x - b.attachment!.to.x),
      (_, i) => i < movingIndexRange[0],
    );
    prev.forEach((s, i) => {
      const info = points[i];
      attachInfoMap.set(s.id, [{ x: info[1], y: 0 }]);
    });
    after.forEach((s, i) => {
      const info = points[i + movingIndexRange[1] + 1];
      attachInfoMap.set(s.id, [{ x: info[1], y: 0 }]);
    });
  }

  return { attachInfoMap, attachedPoint: closestSplitInfo[0] };
}

function getEvenlySpacedLineAttachmentBetweenFixedOnes(
  shapeMap: { [id: string]: Shape },
  lineId: string,
  selectedShapeIds: string[],
  indexShapeId: string,
  baseTo: IVec2,
): Map<string, [to: IVec2]> {
  const line = shapeMap[lineId] as LineShape;
  const movingTargetIdSet = new Set(selectedShapeIds);
  const allTargetIdSet = new Set(movingTargetIdSet);
  const fixedTargetIdSet = new Set<string>();
  toList(shapeMap).forEach((s) => {
    if (s.attachment?.id === line.id && !movingTargetIdSet.has(s.id)) {
      allTargetIdSet.add(s.id);
      fixedTargetIdSet.add(s.id);
    }
  });

  const indexShape = shapeMap[indexShapeId];
  const selectedShapes = selectedShapeIds.map((id) => shapeMap[id]);
  const [attachedList, otherList] = splitList(
    selectedShapes.filter((s) => s.id !== indexShapeId),
    (s) => s.attachment?.id === line.id,
  );

  const attachInfoMap = new Map<string, [to: IVec2]>();

  attachedList.sort((a, b) => a.attachment!.to.x - b.attachment!.to.x);
  let lastRate = baseTo.x;
  attachedList.forEach((s) => {
    const v = s.attachment!.to.x - indexShape.attachment!.to.x;
    const rate = clamp(0, 1, baseTo.x + v);
    attachInfoMap.set(s.id, [{ x: rate, y: 0 }]);
    lastRate = rate;
  });

  if (otherList.length > 0) {
    let nextRate = 1;
    fixedTargetIdSet.forEach((id) => {
      const s = shapeMap[id];
      const rate = s.attachment!.to.x;
      if (lastRate < rate) {
        nextRate = Math.min(rate, nextRate);
      }
    });

    const toLerpFn = (t: number) => lerpPoint({ x: lastRate, y: 0 }, { x: nextRate, y: 0 }, t);
    const step = 1 / (otherList.length + (fixedTargetIdSet.size > 0 ? 1 : 0));
    otherList.forEach((s, i) => {
      const to = toLerpFn(step * (i + 1));
      attachInfoMap.set(s.id, [to]);
    });
  }

  return attachInfoMap;
}
