import type { AppCanvasState } from "../core";
import { handleHistoryEvent } from "../commons";
import { LineShape, addNewVertex, getLinePath, isLineShape } from "../../../../shapes/line";
import { IVec2, add } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { ConnectionResult, LineSnapping, newLineSnapping, renderConnectionResult } from "../../../lineSnapping";
import { LineLabelHandler, newLineLabelHandler } from "../../../lineLabelHandler";
import { mergeMap } from "../../../../utils/commons";
import { newSelectionHubState } from "../selectionHubState";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../../shapeSnapping";
import { TAU } from "../../../../utils/geometry";
import { getAutomaticCurve } from "../../../../utils/curveLine";

interface Option {
  lineShape: LineShape;
  index: number;
  p: IVec2;
}

export function newMovingNewVertexState(option: Option): AppCanvasState {
  let vertex = option.p;
  let lineSnapping: LineSnapping;
  let connectionResult: ConnectionResult | undefined;
  let lineLabelHandler: LineLabelHandler;
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;

  return {
    getLabel: () => "MovingNewVertex",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const selectedIds = ctx.getSelectedShapeIdMap();
      const snappableShapes = shapeComposite.getShapesOverlappingRect(
        Object.values(shapeMap).filter((s) => !selectedIds[s.id] && !isLineShape(s)),
        ctx.getViewRect(),
      );
      const mockMovingLine = { ...option.lineShape, ...addNewVertex(option.lineShape, option.index, { x: 0, y: 0 }) };

      lineSnapping = newLineSnapping({
        snappableShapes,
        getShapeStruct: ctx.getShapeStruct,
        movingLine: mockMovingLine,
        movingIndex: option.index,
      });

      const snappableLines = shapeComposite.getShapesOverlappingRect(
        Object.values(shapeMap).filter((s) => isLineShape(s)),
        ctx.getViewRect(),
      );
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableLines.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });

      lineLabelHandler = newLineLabelHandler({ ctx });
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

          if (connectionResult?.connection) {
            vertex = connectionResult.p;
            snappingResult = undefined;
          } else {
            snappingResult = event.data.ctrl ? undefined : shapeSnapping.testPoint(point);
            vertex = snappingResult ? add(point, snappingResult.diff) : point;
            connectionResult = undefined;
          }

          const patch = addNewVertex(option.lineShape, option.index, vertex, connectionResult?.connection);

          if (option.lineShape.curveType === "auto") {
            patch.curves = getAutomaticCurve(getLinePath({ ...option.lineShape, ...patch }));
          }

          const patchMap = { [option.lineShape.id]: patch };
          const labelPatch = lineLabelHandler.onModified(patchMap);
          ctx.setTmpShapeMap(mergeMap(patchMap, labelPatch));
          return;
        }
        case "pointerup": {
          const tmpMap = ctx.getTmpShapeMap();
          if (Object.keys(tmpMap).length > 0) {
            ctx.patchShapes(tmpMap);
          }
          return newSelectionHubState;
        }
        case "selection": {
          return newSelectionHubState;
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return newSelectionHubState;
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const vertexSize = 8 * scale;
      applyFillStyle(renderCtx, { color: style.selectionPrimary });
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
