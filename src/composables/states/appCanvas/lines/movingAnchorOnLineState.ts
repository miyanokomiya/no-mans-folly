import type { AppCanvasState } from "../core";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { mapReduce, patchPipe } from "../../../../utils/commons";
import { getLinePath, isLineShape, LineShape } from "../../../../shapes/line";
import { expandRectByScale, ISegment, TAU } from "../../../../utils/geometry";
import { getRectCenter, moveRect, sub } from "okageo";
import { applyCurvePath, applyLocalSpace, applyPath } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { ShapeComposite } from "../../../shapeComposite";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { getLineEdgeInfo } from "../../../../shapes/utils/line";
import { getNextAttachmentAnchor } from "../../../lineAttachmentHandler";

type Option = {
  lineId: string;
  shapeId: string;
};

export function newMovingAnchorOnLineState(option: Option): AppCanvasState {
  let line: LineShape;
  let edgeInfo: ReturnType<typeof getLineEdgeInfo>;
  let subShapeComposite: ShapeComposite; // for avoid regarding temporary shapes

  return {
    getLabel: () => "MovingAnchorOnLine",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_SNAP]);
      const shapeComposite = ctx.getShapeComposite();
      line = shapeComposite.shapeMap[option.lineId] as LineShape;
      const indexShape = shapeComposite.shapeMap[option.shapeId];
      if (!isLineShape(line) || !shapeComposite.attached(indexShape)) {
        return ctx.states.newSelectionHubState;
      }

      edgeInfo = getLineEdgeInfo(line);
      subShapeComposite = shapeComposite.getSubShapeComposite(Object.keys(ctx.getSelectedShapeIdMap()));
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setCommandExams();
      ctx.setTmpShapeMap({});
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const diff = sub(event.data.current, event.data.start);
          const shapeComposite = ctx.getShapeComposite();
          const indexShape = subShapeComposite.shapeMap[option.shapeId];
          if (!shapeComposite.attached(indexShape)) {
            return ctx.states.newSelectionHubState;
          }

          const [localBounds] = subShapeComposite.getLocalSpace(indexShape);
          const attachedP = edgeInfo.lerpFn(indexShape.attachment.to.x);
          const nextAnchorP = sub(attachedP, diff);
          const nextAnchor = getNextAttachmentAnchor(subShapeComposite, indexShape, nextAnchorP);

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
                  return s.attachment ? { attachment: { ...s.attachment, anchor: adjustedNextAnchor } } : {};
                });
              },
              (_, currentPatch) => {
                return getPatchAfterLayouts(shapeComposite, { update: currentPatch });
              },
            ],
            mapReduce(ctx.getSelectedShapeIdMap(), (_, id) => shapeComposite.shapeMap[id]),
          ).patch;
          ctx.setTmpShapeMap(patch);
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

      const indexShape = subShapeComposite.shapeMap[option.shapeId];
      if (indexShape.attachment) {
        const lineAnchor = edgeInfo.lerpFn(indexShape.attachment.to.x);
        applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: 2 * scale });
        renderCtx.beginPath();
        applyCurvePath(renderCtx, getLinePath(line), line.curves);
        renderCtx.stroke();

        const [localBounds, rotation] = subShapeComposite.getLocalSpace(indexShape);
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
