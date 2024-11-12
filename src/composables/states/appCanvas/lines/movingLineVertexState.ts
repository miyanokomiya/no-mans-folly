import type { AppCanvasState } from "../core";
import { LineShape, getLinePath, patchVertex } from "../../../../shapes/line";
import { add, sub } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import {
  ConnectionResult,
  LineSnapping,
  isLineSnappableShape,
  newLineSnapping,
  optimizeLinePath,
  renderConnectionResult,
} from "../../../lineSnapping";
import { ElbowLineHandler, newElbowLineHandler } from "../../../elbowLineHandler";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../../shapeSnapping";
import { scaleGlobalAlpha } from "../../../../utils/renderer";
import { TAU } from "../../../../utils/geometry";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { renderBezierControls } from "../../../lineBounding";
import { newCoordinateRenderer } from "../../../coordinateRenderer";
import { getLineUnrelatedIds } from "../../../shapeRelation";
import { newPreserveAttachmentHandler, PreserveAttachmentHandler } from "../../../lineAttachmentHandler";

interface Option {
  lineShape: LineShape;
  index: number;
}

export function newMovingLineVertexState(option: Option): AppCanvasState {
  const origin = getLinePath(option.lineShape)[option.index];
  let vertex = origin;
  let lineSnapping: LineSnapping;
  let connectionResult: ConnectionResult | undefined;
  let elbowHandler: ElbowLineHandler | undefined;
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;
  let preserveAttachmentHandler: PreserveAttachmentHandler;
  const coordinateRenderer = newCoordinateRenderer({ coord: vertex });

  return {
    getLabel: () => "MovingLineVertex",
    onStart: (ctx) => {
      ctx.startDragging();

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const snappableCandidateIds = getLineUnrelatedIds(shapeComposite, [option.lineShape.id]);
      const snappableCandidates = shapeComposite.getShapesOverlappingRect(
        snappableCandidateIds.map((id) => shapeMap[id]),
        ctx.getViewRect(),
      );

      const snappableShapes = snappableCandidates.filter((s) => isLineSnappableShape(shapeComposite, s));
      lineSnapping = newLineSnapping({
        movingLine: option.lineShape,
        movingIndex: option.index,
        snappableShapes,
        gridSnapping: ctx.getGrid().getSnappingLines(),
        getShapeStruct: ctx.getShapeStruct,
      });

      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableCandidates.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });

      elbowHandler = option.lineShape.lineType === "elbow" ? newElbowLineHandler(ctx) : undefined;
      preserveAttachmentHandler = newPreserveAttachmentHandler({ shapeComposite, lineId: option.lineShape.id });
      if (preserveAttachmentHandler.hasAttachment) {
        ctx.setCommandExams([COMMAND_EXAM_SRC.PRESERVE_ATTACHMENT, COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);
      } else {
        ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);
      }
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const point = event.data.current;
          connectionResult = event.data.ctrl ? undefined : lineSnapping.testConnection(point, ctx.getScale());

          if (connectionResult) {
            vertex = connectionResult.p;
            snappingResult = undefined;

            if (!connectionResult.connection && connectionResult.guidLines?.length === 1) {
              snappingResult = shapeSnapping.testPointOnLine(vertex, connectionResult.guidLines[0]);
              vertex = snappingResult ? add(vertex, snappingResult.diff) : vertex;
            }
          } else {
            snappingResult = event.data.ctrl ? undefined : shapeSnapping.testPoint(point);
            vertex = snappingResult ? add(point, snappingResult.diff) : add(origin, sub(point, event.data.start));
            connectionResult = undefined;
          }

          coordinateRenderer.saveCoord(vertex);
          let patch = patchVertex(option.lineShape, option.index, vertex, connectionResult?.connection);

          const optimized = optimizeLinePath(ctx, { ...option.lineShape, ...patch });
          patch = optimized ? { ...patch, ...optimized } : patch;

          if (elbowHandler) {
            const body = elbowHandler.optimizeElbow({ ...option.lineShape, ...patch });
            patch = { ...patch, body };
          }

          preserveAttachmentHandler.setActive(!!event.data.alt);
          const update = {
            [option.lineShape.id]: patch,
            ...preserveAttachmentHandler.getPatch(patch),
          };

          const shapeComposite = ctx.getShapeComposite();
          ctx.setTmpShapeMap(getPatchAfterLayouts(shapeComposite, { update }));
          return;
        }
        case "pointerup": {
          const tmpMap = ctx.getTmpShapeMap();
          if (Object.keys(tmpMap).length > 0) {
            ctx.patchShapes(tmpMap);
          }
          return ctx.states.newSelectionHubState;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const vertexSize = 8 * scale;

      coordinateRenderer.render(renderCtx, ctx.getViewRect(), scale);

      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      scaleGlobalAlpha(renderCtx, 0.5, () => {
        renderCtx.beginPath();
        renderCtx.arc(origin.x, origin.y, vertexSize, 0, TAU);
        renderCtx.fill();
      });

      const shapeComposite = ctx.getShapeComposite();
      const line = shapeComposite.mergedShapeMap[option.lineShape.id] as LineShape;
      renderBezierControls(renderCtx, style, scale, line);

      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.beginPath();
      renderCtx.arc(vertex.x, vertex.y, vertexSize, 0, TAU);
      renderCtx.fill();

      if (connectionResult) {
        renderConnectionResult(renderCtx, {
          result: connectionResult,
          scale: ctx.getScale(),
          style: ctx.getStyleScheme(),
        });
      }

      if (snappingResult) {
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
          getTargetRect: (id) => shapeComposite.getWrapperRect(shapeComposite.shapeMap[id]),
        });
      }

      preserveAttachmentHandler.render(renderCtx, style, scale, ctx.getTmpShapeMap());
    },
  };
}
