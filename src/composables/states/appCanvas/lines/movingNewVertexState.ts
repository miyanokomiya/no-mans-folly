import type { AppCanvasState } from "../core";
import { LineShape, addNewVertex } from "../../../../shapes/line";
import { IVec2, add } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import {
  ConnectionResult,
  LineSnapping,
  isLineSnappableShape,
  newLineSnapping,
  optimizeLinePath,
  renderConnectionResult,
} from "../../../lineSnapping";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../../shapeSnapping";
import { TAU } from "../../../../utils/geometry";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { renderBezierControls } from "../../../lineBounding";
import { newCoordinateRenderer } from "../../../coordinateRenderer";
import { newPreserveAttachmentHandler, PreserveAttachmentHandler } from "../../../lineAttachmentHandler";
import { getSnappableCandidates } from "../commons";

interface Option {
  lineShape: LineShape;
  index: number;
  p: IVec2;
}

export function newMovingNewVertexState(option: Option): AppCanvasState {
  let vertex = option.p;
  let lineSnapping: LineSnapping;
  let connectionResult: ConnectionResult | undefined;
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;
  let preserveAttachmentHandler: PreserveAttachmentHandler;
  const coordinateRenderer = newCoordinateRenderer({ coord: vertex });

  return {
    getLabel: () => "MovingNewVertex",
    onStart: (ctx) => {
      ctx.startDragging();

      const shapeComposite = ctx.getShapeComposite();
      const snappableCandidates = getSnappableCandidates(ctx, [option.lineShape.id]);

      const snappableShapes = snappableCandidates.filter((s) => isLineSnappableShape(shapeComposite, s));
      const mockMovingLine = { ...option.lineShape, ...addNewVertex(option.lineShape, option.index, { x: 0, y: 0 }) };

      lineSnapping = newLineSnapping({
        snappableShapes,
        getShapeStruct: ctx.getShapeStruct,
        movingLine: mockMovingLine,
        movingIndex: option.index,
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });

      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableCandidates.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });

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
            vertex = snappingResult ? add(point, snappingResult.diff) : point;
            connectionResult = undefined;
          }

          coordinateRenderer.saveCoord(vertex);
          let patch = addNewVertex(option.lineShape, option.index, vertex, connectionResult?.connection);
          const optimized = optimizeLinePath(ctx, { ...option.lineShape, ...patch });
          patch = optimized ? { ...patch, ...optimized } : patch;

          preserveAttachmentHandler.setActive(!!event.data.alt);
          const update = {
            [option.lineShape.id]: patch,
            ...preserveAttachmentHandler.getPatch(patch),
          };

          ctx.setTmpShapeMap(getPatchAfterLayouts(ctx.getShapeComposite(), { update }));
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

      coordinateRenderer.render(renderCtx, ctx.getViewRect(), scale);

      const line = ctx.getShapeComposite().mergedShapeMap[option.lineShape.id] as LineShape;
      renderBezierControls(renderCtx, style, scale, line);

      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      const vertexSize = 8 * scale;
      renderCtx.beginPath();
      renderCtx.ellipse(vertex.x, vertex.y, vertexSize, vertexSize, 0, 0, TAU);
      renderCtx.fill();

      if (connectionResult) {
        renderConnectionResult(renderCtx, {
          result: connectionResult,
          scale: ctx.getScale(),
          style: ctx.getStyleScheme(),
        });
      }

      if (snappingResult) {
        const shapeComposite = ctx.getShapeComposite();
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
