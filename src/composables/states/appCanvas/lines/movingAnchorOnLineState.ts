import type { AppCanvasState } from "../core";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { mapFilter, mapReduce, patchPipe } from "../../../../utils/commons";
import { getLinePath, isLineShape, LineShape } from "../../../../shapes/line";
import { expandRectByScale, ISegment, TAU } from "../../../../utils/geometry";
import { getRectCenter, IVec2, moveRect, sub } from "okageo";
import { applyCurvePath, applyLocalSpace, applyPath } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { getNextShapeComposite, ShapeComposite } from "../../../shapeComposite";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { Shape } from "../../../../models";
import { getLineEdgeInfo } from "../../../../shapes/utils/line";
import { getNextAttachmentAnchor } from "../../../lineAttachmentHandler";

type Option = {
  lineId: string;
  shapeId: string;
};

/**
 * This state is intended to be stacked up on "MovingOnLine" state.
 */
export function newMovingAnchorOnLineState(option: Option): AppCanvasState {
  let keepMoving = false;
  let line: LineShape;
  let edgeInfo: ReturnType<typeof getLineEdgeInfo>;
  let shapeCompositeAtStart: ShapeComposite;
  let patchAtStart: { [id: string]: Partial<Shape> };
  let pointAtStart: IVec2;

  return {
    getLabel: () => "MovingAnchorOnLine",
    onStart: (ctx) => {
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_SNAP]);
      const shapeComposite = ctx.getShapeComposite();
      patchAtStart = ctx.getTmpShapeMap();
      shapeCompositeAtStart = getNextShapeComposite(shapeComposite, { update: patchAtStart });
      line = shapeComposite.shapeMap[option.lineId] as LineShape;
      const indexShapeAtStart = shapeCompositeAtStart.shapeMap[option.shapeId];
      if (!isLineShape(line) || !shapeCompositeAtStart.attached(indexShapeAtStart)) {
        keepMoving = true;
        return { type: "break" };
      }

      edgeInfo = getLineEdgeInfo(line);
      pointAtStart = ctx.getCursorPoint();
    },
    onEnd: (ctx) => {
      ctx.setCommandExams();
      if (!keepMoving) {
        ctx.setTmpShapeMap({});
      }
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          if (!event.data.alt) {
            keepMoving = true;
            return { type: "break" };
          }

          const diff = sub(event.data.current, pointAtStart);
          const shapeComposite = ctx.getShapeComposite();
          const indexShapeAtStart = shapeCompositeAtStart.shapeMap[option.shapeId];
          const [localBounds] = shapeCompositeAtStart.getLocalSpace(indexShapeAtStart);
          const attachedP = edgeInfo.lerpFn(indexShapeAtStart.attachment!.to.x);
          const nextAnchorP = sub(attachedP, diff);
          const nextAnchor = getNextAttachmentAnchor(shapeCompositeAtStart, indexShapeAtStart, nextAnchorP);

          let adjustedNextAnchor = nextAnchor;
          if (!event.data.ctrl) {
            const threshold = 10 * ctx.getScale();
            adjustedNextAnchor = {
              x: Math.abs(nextAnchor.x - 0.5) * localBounds.width < threshold ? 0.5 : nextAnchor.x,
              y: Math.abs(nextAnchor.y - 0.5) * localBounds.height < threshold ? 0.5 : nextAnchor.y,
            };
          }

          const patch = patchPipe(
            [
              (src) => {
                return mapReduce(src, (s) => {
                  const latestShape = shapeCompositeAtStart.shapeMap[s.id];
                  return latestShape.attachment
                    ? { ...patchAtStart[s.id], attachment: { ...latestShape.attachment, anchor: adjustedNextAnchor } }
                    : patchAtStart[s.id];
                });
              },
              (src) => {
                // Mix other shapes' patch
                return mapFilter(patchAtStart, (_, id) => !src[id]);
              },
              (_, currentPatch) => {
                return getPatchAfterLayouts(shapeCompositeAtStart, { update: currentPatch });
              },
            ],
            mapReduce(ctx.getSelectedShapeIdMap(), (_, id) => shapeComposite.shapeMap[id]),
          );
          ctx.setTmpShapeMap(patch.patch);
          return;
        }
        case "pointerup": {
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

      const indexShapeAtStart = shapeCompositeAtStart.shapeMap[option.shapeId];
      if (indexShapeAtStart.attachment) {
        const lineAnchor = edgeInfo.lerpFn(indexShapeAtStart.attachment.to.x);
        applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: 2 * scale });
        renderCtx.beginPath();
        applyCurvePath(renderCtx, getLinePath(line), line.curves);
        renderCtx.stroke();

        const [localBounds, rotation] = shapeCompositeAtStart.getLocalSpace(indexShapeAtStart);
        const localC = getRectCenter(localBounds);
        const localBoundsAtAnchor = moveRect(localBounds, { x: lineAnchor.x - localC.x, y: lineAnchor.y - localC.y });
        applyLocalSpace(renderCtx, localBoundsAtAnchor, rotation, () => {
          const toOriginVec = { x: -localBoundsAtAnchor.x, y: -localBoundsAtAnchor.y };
          const localBoundsAtOrigin = moveRect(localBoundsAtAnchor, toOriginVec);
          const anchorBounds = expandRectByScale(localBoundsAtOrigin, 2);
          applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * scale, dash: "long" });
          renderCtx.beginPath();
          renderCtx.rect(anchorBounds.x, anchorBounds.y, anchorBounds.width, anchorBounds.height);
          renderCtx.stroke();

          const latestIndexShape = ctx.getShapeComposite().mergedShapeMap[option.shapeId];
          const guidlines: ISegment[] = [];
          if (latestIndexShape.attachment?.anchor.x === 0.5) {
            guidlines.push([
              { x: anchorBounds.x + anchorBounds.width / 2, y: anchorBounds.y },
              { x: anchorBounds.x + anchorBounds.width / 2, y: anchorBounds.y + anchorBounds.height },
            ]);
          }
          if (latestIndexShape.attachment?.anchor.y === 0.5) {
            guidlines.push([
              { x: anchorBounds.x, y: anchorBounds.y + anchorBounds.height / 2 },
              { x: anchorBounds.x + anchorBounds.width, y: anchorBounds.y + anchorBounds.height / 2 },
            ]);
          }
          if (guidlines.length > 0) {
            applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * scale });
            renderCtx.beginPath();
            guidlines.forEach((seg) =>
              applyPath(renderCtx, [
                { x: seg[0].x, y: seg[0].y },
                { x: seg[1].x, y: seg[1].y },
              ]),
            );
            renderCtx.stroke();
          }
        });

        applyFillStyle(renderCtx, { color: style.selectionSecondaly });
        renderCtx.beginPath();
        renderCtx.arc(lineAnchor.x, lineAnchor.y, 6 * scale, 0, TAU);
        renderCtx.fill();
      }
    },
  };
}
