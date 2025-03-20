import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { newDefaultState } from "../defaultState";
import { getLinePath, LineShape, patchVertex } from "../../../../shapes/line";
import { ConnectionResult, isLineSnappableShape, newLineSnapping, renderConnectionResult } from "../../../lineSnapping";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { newShapeSnapping } from "../../../shapeSnapping";
import { isSame, IVec2 } from "okageo";
import { TAU } from "../../../../utils/geometry";
import { newShapeComposite } from "../../../shapeComposite";
import { handleCommonWheel } from "../../commons";
import { newCoordinateRenderer } from "../../../coordinateRenderer";
import { getSnappableCandidates } from "../commons";
import { newCacheWithArg } from "../../../../utils/stateful/cache";
import { isVNNodeShape, VnNodeShape } from "../../../../shapes/vectorNetworks/vnNode";
import { createShape } from "../../../../shapes";
import { newShapeRenderer } from "../../../shapeRenderer";
import { generateFindexAfter, generateFindexBefore } from "../../../shapeRelation";
import { findBackward } from "../../../../utils/commons";

interface Option {
  // This state creates a stright edge, so that the "body" value of this shape does nothing.
  shape: LineShape;
}

/**
 * Works similarly to `newLineDrawingState`, but this state is dedicated to creating a vector network edge.
 */
export function newVnEdgeDrawingState(option: Option): AppCanvasState {
  const srcShape: LineShape = { ...option.shape, body: [] };
  const linePath = getLinePath(srcShape);
  const movingIndex = linePath.length - 1;
  let latestShape = srcShape;
  let vnNode: VnNodeShape | undefined;
  let vertex = linePath[movingIndex];
  let connectionResult: ConnectionResult | undefined;
  const coordinateRenderer = newCoordinateRenderer({ coord: vertex });
  let hoverMode = false;

  const lineSnappingCache = newCacheWithArg((ctx: AppCanvasStateContext) => {
    const shapeComposite = ctx.getShapeComposite();
    const snappableCandidates = getSnappableCandidates(ctx, []);
    const shapeSnapping = newShapeSnapping({
      shapeSnappingList: snappableCandidates.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
      gridSnapping: ctx.getGrid().getSnappingLines(),
      settings: ctx.getUserSetting(),
    });
    const snappableShapes = snappableCandidates.filter((s) => isLineSnappableShape(shapeComposite, s));
    return {
      withGuideline: newLineSnapping({
        snappableShapes,
        shapeSnapping,
        getShapeStruct: ctx.getShapeStruct,
        movingLine: srcShape,
        movingIndex,
        ignoreCurrentLine: true,
      }),
      withoutGuideline: newLineSnapping({
        snappableShapes,
        getShapeStruct: ctx.getShapeStruct,
        movingLine: srcShape,
        movingIndex,
        ignoreCurrentLine: true,
      }),
    };
  });

  const getConnectionResult = (
    point: IVec2,
    ctrl: boolean | undefined,
    ctx: AppCanvasStateContext,
  ): ConnectionResult | undefined => {
    const snapping = lineSnappingCache.getValue(ctx);
    return (ctrl ? snapping.withoutGuideline : snapping.withGuideline).testConnection(point, ctx.getScale());
  };

  const createMovingVnNode = (ctx: AppCanvasStateContext) => {
    const shapeComposite = ctx.getShapeComposite();
    const srcConnectedNode = srcShape.pConnection ? shapeComposite.shapeMap[srcShape.pConnection.id] : undefined;
    return createShape<VnNodeShape>(ctx.getShapeStruct, "vn_node", {
      ...srcConnectedNode,
      id: ctx.generateUuid(),
      findex: generateFindexAfter(shapeComposite, srcShape.id),
      p: vertex,
    });
  };

  return {
    getLabel: () => "VnEdgeDrawing",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);
      vnNode = createMovingVnNode(ctx);
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const shapeComposite = ctx.getShapeComposite();
          const point = event.data.current;
          connectionResult = getConnectionResult(point, event.data.ctrl, ctx);

          if (connectionResult?.connection) {
            const connected = shapeComposite.shapeMap[connectionResult.connection.id];
            // Dismiss the connection if the connected shape is not a VN node.
            if (!connected || !isVNNodeShape(connected)) {
              connectionResult = { ...connectionResult, connection: undefined };
            }
          }

          vertex = connectionResult?.p ?? point;
          coordinateRenderer.saveCoord(vertex);

          // Check if there's a VN node at the point.
          // This is less performant but simpler and accurate.
          const nodeAtPoint = findBackward(shapeComposite.shapes, (s) => isVNNodeShape(s) && isSame(s.p, vertex));
          if (nodeAtPoint) {
            vnNode = undefined;
          } else {
            vnNode = vnNode ? { ...vnNode, p: vertex } : createMovingVnNode(ctx);
          }
          const connectedNode = nodeAtPoint ?? vnNode;

          const patch = patchVertex(
            srcShape,
            movingIndex,
            vertex,
            connectedNode ? { id: connectedNode.id, rate: { x: 0.5, y: 0.5 } } : undefined,
          );

          let findex = srcShape.findex;
          if (connectedNode) {
            // Bring the line to the back of the currently connected VN node.
            if (connectedNode.findex < findex) {
              findex = generateFindexBefore(shapeComposite, connectedNode.id);
            }
          }

          latestShape = { ...srcShape, ...patch, findex };
          ctx.redraw();
          return;
        }
        case "pointerup": {
          if (isSame(latestShape.p, latestShape.q)) {
            // When the line has zero length, continue drawing it at first.
            // When it happens again, cancel drawing the line.
            if (!hoverMode) {
              hoverMode = true;
              return;
            } else {
              return ctx.states.newSelectionHubState;
            }
          }

          if (vnNode) {
            ctx.addShapes([latestShape, vnNode]);
            ctx.selectShape(vnNode.id);
          } else {
            ctx.addShapes([latestShape]);
            ctx.selectShape(latestShape.qConnection?.id ?? latestShape.id);
          }
          return ctx.states.newSelectionHubState;
        }
        case "keydown":
          switch (event.data.key) {
            case "Escape":
              return ctx.states.newSelectionHubState;
            case "g":
              if (event.data.shift) return;
              ctx.patchUserSetting({ grid: ctx.getGrid().disabled ? "on" : "off" });
              lineSnappingCache.update();
              return;
            default:
              return;
          }
        case "wheel":
          handleCommonWheel(ctx, event);
          lineSnappingCache.update();
          return;
        case "history":
          return newDefaultState;
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const shapeComposite = ctx.getShapeComposite();
      const previewShapes = vnNode ? [latestShape, { ...vnNode, alpha: (vnNode.alpha ?? 1) / 2 }] : [latestShape];

      const previewShapeComposite = newShapeComposite({
        shapes: previewShapes,
        getStruct: ctx.getShapeStruct,
      });
      newShapeRenderer({ shapeComposite: previewShapeComposite, scale }).render(renderCtx);

      coordinateRenderer.render(renderCtx, ctx.getViewRect(), scale);

      const vertexSize = 8 * scale;
      applyFillStyle(renderCtx, { color: style.selectionPrimary });
      renderCtx.beginPath();
      renderCtx.ellipse(vertex.x, vertex.y, vertexSize, vertexSize, 0, 0, TAU);
      renderCtx.fill();

      if (connectionResult) {
        renderConnectionResult(renderCtx, {
          result: connectionResult,
          scale,
          style,
          shapeComposite,
        });
      }
    },
  };
}
