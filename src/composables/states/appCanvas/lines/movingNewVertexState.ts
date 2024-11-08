import type { AppCanvasState } from "../core";
import { LineShape, addNewVertex, isLineShape } from "../../../../shapes/line";
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
import { getLineRelatedDependantMap } from "../../../shapeRelation";

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
  const coordinateRenderer = newCoordinateRenderer({ coord: vertex });

  return {
    getLabel: () => "MovingNewVertex",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const selectedIds = ctx.getSelectedShapeIdMap();
      const dependantMap = getLineRelatedDependantMap(shapeComposite, [option.lineShape.id]);
      const unrelatedShapes = shapeComposite.getShapesOverlappingRect(
        Object.values(shapeMap).filter((s) => !selectedIds[s.id] && !dependantMap.has(s.id)),
        ctx.getViewRect(),
      );

      const snappableShapes = unrelatedShapes.filter((s) => isLineSnappableShape(shapeComposite, s));
      const mockMovingLine = { ...option.lineShape, ...addNewVertex(option.lineShape, option.index, { x: 0, y: 0 }) };

      lineSnapping = newLineSnapping({
        snappableShapes,
        getShapeStruct: ctx.getShapeStruct,
        movingLine: mockMovingLine,
        movingIndex: option.index,
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });

      const snappableLines = unrelatedShapes.filter((s) => isLineShape(s));
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableLines.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });
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
          } else {
            snappingResult = event.data.ctrl ? undefined : shapeSnapping.testPoint(point);
            vertex = snappingResult ? add(point, snappingResult.diff) : point;
            connectionResult = undefined;
          }

          coordinateRenderer.saveCoord(vertex);
          let patch = addNewVertex(option.lineShape, option.index, vertex, connectionResult?.connection);
          const optimized = optimizeLinePath(ctx, { ...option.lineShape, ...patch });
          patch = optimized ? { ...patch, ...optimized } : patch;

          ctx.setTmpShapeMap(
            getPatchAfterLayouts(ctx.getShapeComposite(), { update: { [option.lineShape.id]: patch } }),
          );
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
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
        });
      }
    },
  };
}
