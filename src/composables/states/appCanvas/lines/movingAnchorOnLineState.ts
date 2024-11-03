import type { AppCanvasState } from "../core";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { mapReduce, patchPipe } from "../../../../utils/commons";
import { getLinePath, isLineShape, LineShape } from "../../../../shapes/line";
import { getRelativeRateWithinRect, TAU } from "../../../../utils/geometry";
import { IVec2, sub } from "okageo";
import { applyCurvePath, applyPath } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { getNextShapeComposite, ShapeComposite } from "../../../shapeComposite";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { Shape } from "../../../../models";
import { getLineEdgeInfo } from "../../../../shapes/utils/line";

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
          const indexShapeAtStartEditAnchor = shapeCompositeAtStart.shapeMap[option.shapeId];
          const boundsAtStart = shapeCompositeAtStart.getWrapperRect(indexShapeAtStartEditAnchor);
          const attachedP = edgeInfo.lerpFn(indexShapeAtStartEditAnchor.attachment!.to.x);
          const nextAnchorP = sub(attachedP, diff);
          const nextAnchor = getRelativeRateWithinRect(boundsAtStart, nextAnchorP, true);

          let adjustedNextAnchor = nextAnchor;
          if (!event.data.ctrl) {
            const threshold = 10 * ctx.getScale();
            adjustedNextAnchor = {
              x: Math.abs(nextAnchor.x - 0.5) * boundsAtStart.width < threshold ? 0.5 : nextAnchor.x,
              y: Math.abs(nextAnchor.y - 0.5) * boundsAtStart.height < threshold ? 0.5 : nextAnchor.y,
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

        const boundsAtStart = shapeCompositeAtStart.getWrapperRect(indexShapeAtStart);
        const anchorBounds = {
          x: lineAnchor.x - boundsAtStart.width,
          y: lineAnchor.y - boundsAtStart.height,
          width: boundsAtStart.width * 2,
          height: boundsAtStart.height * 2,
        };
        applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * scale, dash: "long" });
        renderCtx.beginPath();
        renderCtx.rect(anchorBounds.x, anchorBounds.y, anchorBounds.width, anchorBounds.height);
        renderCtx.stroke();

        const shapeComposite = ctx.getShapeComposite();
        const latestIndexShape = shapeComposite.mergedShapeMap[option.shapeId];
        const latestBounds = shapeComposite.getWrapperRect(latestIndexShape);
        applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: 2 * scale });
        renderCtx.beginPath();
        renderCtx.rect(latestBounds.x, latestBounds.y, latestBounds.width, latestBounds.height);
        renderCtx.stroke();

        applyFillStyle(renderCtx, { color: style.selectionSecondaly });
        renderCtx.beginPath();
        renderCtx.arc(lineAnchor.x, lineAnchor.y, 6 * scale, 0, TAU);
        renderCtx.fill();

        if (latestIndexShape.attachment?.anchor.x === 0.5) {
          applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * scale });
          renderCtx.beginPath();
          applyPath(renderCtx, [
            { x: anchorBounds.x + anchorBounds.width / 2, y: anchorBounds.y },
            { x: anchorBounds.x + anchorBounds.width / 2, y: anchorBounds.y + anchorBounds.height },
          ]);
          renderCtx.stroke();
        }
        if (latestIndexShape.attachment?.anchor.y === 0.5) {
          applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * scale });
          renderCtx.beginPath();
          applyPath(renderCtx, [
            { x: anchorBounds.x, y: anchorBounds.y + anchorBounds.height / 2 },
            { x: anchorBounds.x + anchorBounds.width, y: anchorBounds.y + anchorBounds.height / 2 },
          ]);
          renderCtx.stroke();
        }
      }
    },
  };
}
