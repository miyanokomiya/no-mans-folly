import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { getCommonAcceptableEvents, getSnappableCandidates, handleStateEvent } from "../commons";
import { ConnectionResult, isLineSnappableShape, newLineSnapping, renderConnectionResult } from "../../../lineSnapping";
import { isSame, IVec2 } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { newShapeSnapping } from "../../../shapeSnapping";
import { TAU } from "../../../../utils/geometry";
import { newCoordinateRenderer } from "../../../coordinateRenderer";
import { handleCommonWheel } from "../../commons";
import { newCacheWithArg } from "../../../../utils/stateful/cache";
import { getLinePath, isLineShape, LineShape } from "../../../../shapes/line";
import { createShape } from "../../../../shapes";
import { applyCurvePath } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { VnNodeShape } from "../../../../shapes/vectorNetworks/vnNode";
import { newShapeComposite } from "../../../shapeComposite";
import { newShapeRenderer } from "../../../shapeRenderer";
import { getSegmentIndexCloseAt, getShapePatchInfoBySplitingLineAt } from "../../../../shapes/utils/line";
import { Shape } from "../../../../models";
import { seekNearbyVnNode } from "../../../vectorNetwork";
import { generateFindexBefore } from "../../../shapeRelation";

export function newVnNodeInsertReadyState(): AppCanvasState {
  let vertex: IVec2 | undefined;
  let connectionResult: ConnectionResult | undefined;
  let targetIds: string[] = [];
  let vnnode: VnNodeShape | undefined;
  const coordinateRenderer = newCoordinateRenderer();

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
      }),
      withoutGuideline: newLineSnapping({
        snappableShapes,
        getShapeStruct: ctx.getShapeStruct,
      }),
      lines: snappableCandidates.filter((s) => isLineShape(s)),
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

  return {
    getLabel: () => "VnNodeInsertReady",
    onStart: (ctx) => {
      ctx.setCursor();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);
      vertex = ctx.getCursorPoint();
      coordinateRenderer.saveCoord(vertex);
    },
    onResume: () => {
      lineSnappingCache.update();
    },
    onEnd: (ctx) => {
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          switch (event.data.options.button) {
            case 0: {
              if (!connectionResult?.outlineSrc || !vnnode) return ctx.states.newSelectionHubState;

              const vnnodeId = vnnode.id;
              const p = connectionResult.p;
              const shapeComposite = ctx.getShapeComposite();
              // This threshold isn't so important since targets are already chosen for the point.
              const threshold = 1 * ctx.getScale();

              const connection = { id: vnnodeId, rate: { x: 0.5, y: 0.5 } };
              const newShapes: Shape[] = [vnnode];
              const patch: { [id: string]: Partial<Shape> } = {};
              targetIds.forEach((id) => {
                const shape = shapeComposite.mergedShapeMap[id];
                if (!shape || !isLineShape(shape)) return;

                const index = getSegmentIndexCloseAt(shape, p, threshold);
                if (index === -1) return;

                const splitPatch = getShapePatchInfoBySplitingLineAt(shape, index, p, threshold);
                if (!splitPatch) {
                  // Check if the point is at the first or last vertex.
                  // If so, connect the point to the vertex.
                  if (isSame(p, shape.p)) {
                    patch[shape.id] = {
                      pConnection: connection,
                    } as Partial<LineShape>;
                  } else if (isSame(p, shape.q)) {
                    patch[shape.id] = {
                      qConnection: connection,
                    } as Partial<LineShape>;
                  }
                  return;
                }

                const newLine = createShape<LineShape>(ctx.getShapeStruct, "line", {
                  ...shape,
                  ...splitPatch[0],
                  id: ctx.generateUuid(),
                  findex: generateFindexBefore(shapeComposite, shape.id),
                  pConnection: connection,
                });
                newShapes.push(newLine);
                patch[shape.id] = {
                  ...splitPatch[1],
                  qConnection: connection,
                } as Partial<LineShape>;
              });

              ctx.updateShapes({ add: newShapes, update: patch });
              ctx.selectShape(vnnode.id);
              return ctx.states.newSelectionHubState;
            }
            case 1:
              return { type: "stack-resume", getState: () => ctx.states.newPointerDownEmptyState(event.data.options) };
            default:
              return ctx.states.newSelectionHubState;
          }
        case "pointerhover": {
          const point = event.data.current;
          connectionResult = getConnectionResult(point, event.data.ctrl, ctx);
          vertex = connectionResult?.p ?? point;

          const shapeComposite = ctx.getShapeComposite();
          const targetShapes = [connectionResult?.outlineSrc, connectionResult?.outlineSubSrc]
            .map((id) => (id ? shapeComposite.shapeMap[id] : undefined))
            .filter((s): s is LineShape => !!s && isLineShape(s));
          // Regard up to two lines.
          // TODO: It's possible to regard more than two line.
          // => There's no good way to seek lines exactly running through the point.
          targetIds = targetShapes.map((s) => s.id);
          // Inherit parent when all target share the same parent.
          const parentId = targetShapes.every((s) => s.parentId === targetShapes.at(0)?.parentId)
            ? targetShapes.at(0)?.parentId
            : undefined;
          vnnode =
            targetIds.length > 0
              ? vnnode
                ? { ...vnnode, p: vertex }
                : createShape<VnNodeShape>(ctx.getShapeStruct, "vn_node", {
                    ...seekNearbyVnNode(shapeComposite, targetIds),
                    id: ctx.createLastIndex(),
                    findex: ctx.createLastIndex(),
                    p: vertex,
                    parentId,
                  })
              : undefined;

          coordinateRenderer.saveCoord(vertex);
          ctx.redraw();
          return;
        }
        case "keydown":
          switch (event.data.key) {
            case "Escape":
              return ctx.states.newSelectionHubState;
            default:
              return;
          }
        case "wheel":
          handleCommonWheel(ctx, event);
          lineSnappingCache.update();
          return;
        case "history":
          return ctx.states.newSelectionHubState;
        case "state":
          return handleStateEvent(ctx, event, getCommonAcceptableEvents());
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();

      applyStrokeStyle(renderCtx, { color: style.selectionPrimary, width: 2 * scale });
      targetIds.forEach((id) => {
        const shape = ctx.getShapeComposite().mergedShapeMap[id];
        if (!shape || !isLineShape(shape)) return;

        renderCtx.beginPath();
        applyCurvePath(renderCtx, getLinePath(shape), shape.curves);
        renderCtx.stroke();
      });

      if (vnnode) {
        newShapeRenderer({
          shapeComposite: newShapeComposite({ getStruct: ctx.getShapeStruct, shapes: [{ ...vnnode, alpha: 0.5 }] }),
          scale,
        }).render(renderCtx);
      }

      if (vertex) {
        coordinateRenderer.render(renderCtx, ctx.getViewRect(), scale);

        applyFillStyle(renderCtx, { color: style.selectionPrimary });
        renderCtx.beginPath();
        renderCtx.arc(vertex.x, vertex.y, 8 * scale, 0, TAU);
        renderCtx.fill();
      }

      if (connectionResult) {
        const shapeComposite = ctx.getShapeComposite();
        renderConnectionResult(renderCtx, {
          result: connectionResult,
          scale: ctx.getScale(),
          style: ctx.getStyleScheme(),
          shapeComposite,
        });
      }
    },
  };
}
