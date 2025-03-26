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
import { getLinePath, isLineShape, LineShape, patchVertices } from "../../../../shapes/line";
import { createShape } from "../../../../shapes";
import { applyCurvePath } from "../../../../utils/renderer";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { VnNodeShape } from "../../../../shapes/vectorNetworks/vnNode";
import { newShapeComposite } from "../../../shapeComposite";
import { newShapeRenderer } from "../../../shapeRenderer";
import {
  getShapePatchInfoByInsertingVertexThrough,
  getShapePatchInfoBySplittingLineThrough,
} from "../../../../shapes/utils/line";
import { ConnectionPoint, Shape } from "../../../../models";
import { getInheritableVnNodeProperties, patchBySplitAttachingLine, seekNearbyVnNode } from "../../../vectorNetwork";
import { generateFindexAfter, generateFindexBefore } from "../../../shapeRelation";
import { generateKeyBetweenAllowSame } from "../../../../utils/findex";
import { isObjectEmpty } from "../../../../utils/commons";

export function newVnNodeInsertReadyState(): AppCanvasState {
  let vertex: IVec2 | undefined;
  let connectionResult: ConnectionResult | undefined;
  let targetIds: string[] = [];
  let vnnode: VnNodeShape;
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
      ctx.setCommandExams([
        COMMAND_EXAM_SRC.VN_INSERT_VERTEX,
        COMMAND_EXAM_SRC.VN_SPLIT_SEGMENTS,
        COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP,
      ]);
      vertex = ctx.getCursorPoint();
      coordinateRenderer.saveCoord(vertex);
      vnnode = createShape<VnNodeShape>(ctx.getShapeStruct, "vn_node", {
        id: ctx.generateUuid(),
        findex: ctx.createLastIndex(),
        p: vertex,
      });
    },
    onResume: () => {
      lineSnappingCache.update();
    },
    onEnd: (ctx) => {
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointerdown": {
          switch (event.data.options.button) {
            case 0: {
              if (!connectionResult?.outlineSrc) {
                ctx.addShapes([vnnode]);
                ctx.selectShape(vnnode.id);
                return ctx.states.newSelectionHubState;
              }

              const vnnodeId = vnnode.id;
              const p = connectionResult.p;
              // This threshold isn't so important since targets are already chosen for the point.
              const threshold = 1 * ctx.getScale();
              const connection = { id: vnnodeId, rate: { x: 0.5, y: 0.5 } };

              const newShapes: Shape[] = [vnnode];
              const patch: { [id: string]: Partial<Shape> } = {};
              if (event.data.options.shift) {
                const info = handleSplitTargetLines(ctx, targetIds, p, connection, threshold);
                info[0].forEach((s) => newShapes.push(s));
                Object.entries(info[1]).forEach(([id, p]) => {
                  patch[id] = p;
                });
              } else {
                const info = handleInsertVertexToTargetLines(ctx, targetIds, p, connection, threshold);
                Object.entries(info).forEach(([id, p]) => {
                  patch[id] = p;
                });
              }

              ctx.updateShapes({ add: newShapes, update: patch });
              ctx.selectShape(vnnode.id);
              return ctx.states.newSelectionHubState;
            }
            case 1:
              return { type: "stack-resume", getState: () => ctx.states.newPointerDownEmptyState(event.data.options) };
            default:
              return ctx.states.newSelectionHubState;
          }
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
          const findex = targetIds.length > 0 ? generateFindexAfter(shapeComposite, targetIds[0]) : vnnode.findex;
          const nearbyNode = seekNearbyVnNode(shapeComposite, targetIds);
          vnnode = {
            ...vnnode,
            // Inherit the latest nearby node properties.
            ...getInheritableVnNodeProperties(nearbyNode),
            findex,
            p: vertex,
            parentId,
          };

          coordinateRenderer.saveCoord(vertex);
          ctx.redraw();
          return;
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

      newShapeRenderer({
        shapeComposite: newShapeComposite({ getStruct: ctx.getShapeStruct, shapes: [{ ...vnnode, alpha: 0.5 }] }),
        scale,
      }).render(renderCtx);

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

function handleSplitTargetLines(
  ctx: AppCanvasStateContext,
  targetIds: string[],
  p: IVec2,
  connection: { id: string; rate: { x: number; y: number } },
  threshold: number,
): [newShapes: Shape[], patch: { [id: string]: Partial<Shape> }] {
  const shapeComposite = ctx.getShapeComposite();
  const newShapes: Shape[] = [];
  const patch: { [id: string]: Partial<Shape> } = {};
  targetIds.forEach((id) => {
    const shape = shapeComposite.mergedShapeMap[id];
    if (!shape || !isLineShape(shape)) return;

    const splitPatch = getShapePatchInfoBySplittingLineThrough(shape, p, threshold);
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

    let findexFrom = generateFindexBefore(shapeComposite, shape.id);
    const newLines = splitPatch.newSrcList.map((src, i) => {
      const findex = generateKeyBetweenAllowSame(findexFrom, shape.findex);
      findexFrom = findex;
      return createShape<LineShape>(shapeComposite.getShapeStruct, "line", {
        ...shape,
        ...src,
        id: ctx.generateUuid(),
        findex,
        pConnection: connection,
        qConnection: i < splitPatch.newSrcList.length - 1 ? connection : shape.qConnection,
      });
    });
    newShapes.push(...newLines);
    patch[shape.id] = {
      ...splitPatch.patch,
      qConnection: connection,
    } as Partial<LineShape>;

    const splitRates = splitPatch.rateList.map<[string, number]>((rate, i) => [newShapes[i].id, rate]);
    const attachingPatch = patchBySplitAttachingLine(shapeComposite, shape.id, splitRates);
    Object.entries(attachingPatch).forEach(([id, p]) => {
      patch[id] = p;
    });
  });
  return [newShapes, patch];
}

function handleInsertVertexToTargetLines(
  ctx: AppCanvasStateContext,
  targetIds: string[],
  p: IVec2,
  connection: { id: string; rate: { x: number; y: number } },
  threshold: number,
): { [id: string]: Partial<Shape> } {
  const shapeComposite = ctx.getShapeComposite();
  const patch: { [id: string]: Partial<Shape> } = {};
  targetIds.forEach((id) => {
    const shape = shapeComposite.mergedShapeMap[id];
    if (!shape || !isLineShape(shape)) return;

    const insertResult = getShapePatchInfoByInsertingVertexThrough(shape, p, threshold);
    if (insertResult) {
      patch[shape.id] = insertResult?.patch;
    }

    // Update the connections of new vertices.
    // - Inserted vertices are always connected to the point.
    // - Existing vertices at the inserted point should be connected to the point as well.
    const nextShape = patch[shape.id] ? { ...shape, ...patch[shape.id] } : shape;
    const nextVertices = getLinePath(nextShape);
    const vertexPatchData: [number, IVec2, ConnectionPoint][] = [];
    const insertedSet = new Set(insertResult?.insertions.map(([index]) => index) ?? []);
    nextVertices.forEach((v, i) => {
      if (insertedSet.has(i) || isSame(v, p)) {
        vertexPatchData.push([i, v, connection]);
      }
    });
    const connectionPatch = patchVertices(nextShape, vertexPatchData);
    if (!isObjectEmpty(connectionPatch)) {
      patch[shape.id] = { ...patch[shape.id], ...connectionPatch };
    }
  });
  return patch;
}
