import { LineShape, getConnections, getLinePath, isLineShape, patchVertex, patchVertices } from "../shapes/line";
import { RotatedRectPath, TAU, getLocationFromRateOnRectPath } from "../utils/geometry";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { ConnectionPoint, EntityPatchInfo, Shape, StyleScheme } from "../models";
import { applyFillStyle } from "../utils/fillStyle";
import { newElbowLineHandler } from "./elbowLineHandler";
import { optimizeLinePath } from "./lineSnapping";
import { ShapeComposite, getNextShapeComposite, newShapeComposite } from "./shapeComposite";
import { mapEach, mapFilter, toList } from "../utils/commons";
import { CanvasCTX } from "../utils/types";
import { IVec2 } from "okageo";
import { applyStrokeStyle } from "../utils/strokeStyle";

interface Option {
  connectedLinesMap: {
    [id: string]: LineShape[];
  };
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">;
}

/**
 * This handler doesn't detouch line connections.
 * Use "newConnectedLineDetouchHandler" for that purpose.
 */
export function newConnectedLineHandler(option: Option) {
  /**
   * Returns patched properties that are updated in this function.
   * => Returned value doesn't inherit the content of "updatedMap".
   */
  function onModified(updatedMap: { [id: string]: Partial<Shape> }): {
    [id: string]: Partial<LineShape>;
  } {
    const ret: { [id: string]: Partial<LineShape> } = {};

    const shapeComposite = option.ctx.getShapeComposite();
    const shapeMap = shapeComposite.shapeMap;
    const updatedShapeComposite = getNextShapeComposite(shapeComposite, { update: updatedMap });
    const updatedShapeMap: { [id: string]: Shape } = {};
    mapEach(updatedMap, (_, id) => {
      if (shapeMap[id]) {
        updatedShapeMap[id] = updatedShapeComposite.shapeMap[id];
      }
    });

    // Update connections
    mapEach(updatedShapeMap, (shape, id) => {
      if (isLineShape(shape)) {
        const latestPatch = ret[shape.id];
        const latestLine = latestPatch ? { ...shape, ...latestPatch } : shape;

        const connections = getConnections(latestLine);
        let currentPatch = latestPatch;
        let currentLine = latestLine;
        connections.forEach((c, index) => {
          if (!c?.id) return;
          const target = updatedShapeMap[c.id] ?? shapeMap[c.id];
          if (!target) return;

          const rectPath = shapeComposite.getLocalRectPolygon(target);
          const rotation = target.rotation;
          const p = getLocationFromRateOnRectPath(rectPath, rotation, c.rate);
          const vertexPatch = patchVertex(currentLine, index, p, c);
          currentPatch = { ...currentPatch, ...vertexPatch };
          currentLine = { ...currentLine, ...vertexPatch };
        });
        ret[latestLine.id] = currentPatch;
        return;
      }

      const rectPath = shapeComposite.getLocalRectPolygon(shape);
      const rotation = shape.rotation;

      const lines = option.connectedLinesMap[id] ?? [];
      lines.forEach((line) => {
        const latestPatch = ret[line.id];
        const latestLine = latestPatch ? { ...line, ...latestPatch } : line;

        const connections = getConnections(latestLine);
        let currentPatch = latestPatch;
        let currentLine = latestLine;
        connections.forEach((c, index) => {
          if (c?.id !== id) return;

          const p = getLocationFromRateOnRectPath(rectPath, rotation, c.rate);
          const vertexPatch = patchVertex(currentLine, index, p, c);
          currentPatch = { ...currentPatch, ...vertexPatch };
          currentLine = { ...currentLine, ...vertexPatch };
        });

        ret[latestLine.id] = currentPatch;
      });
    });

    // Optimize line connections
    mapEach(ret, (patch, id) => {
      const updated = { ...shapeMap[id], ...(updatedShapeMap[id] ?? {}), ...patch } as LineShape;
      const optimized = optimizeLinePath(
        {
          getShapeComposite: () => updatedShapeComposite,
        },
        updated,
      );
      if (optimized) {
        ret[id] = { ...patch, ...optimized };
      }
    });

    // Update elbow bodies
    {
      const patchedElbows: LineShape[] = [];
      mapEach(ret, (patch, id) => {
        const original = shapeMap[id] as LineShape;
        const updated = updatedMap[id] ?? {};
        const s = { ...original, ...updated, ...patch } as LineShape;
        if (s.lineType === "elbow") {
          patchedElbows.push(s);
        }
      });
      const nextShapeMap: { [id: string]: Shape } = {};
      const elbowConnectedIds = getElbowConnectedShapeIds(patchedElbows);
      elbowConnectedIds.forEach((id) => {
        if (shapeMap[id]) {
          nextShapeMap[id] = updatedShapeMap[id] ?? shapeMap[id];
        }
      });
      patchedElbows.forEach((line) => {
        nextShapeMap[line.id] = line;
      });

      const nextShapeComposite = newShapeComposite({
        shapes: toList(nextShapeMap),
        getStruct: shapeComposite.getShapeStruct,
      });
      const elbowHandler = newElbowLineHandler({
        getShapeComposite: () => nextShapeComposite,
      });

      patchedElbows.forEach((lineShape) => {
        const body = elbowHandler.optimizeElbow(lineShape);
        ret[lineShape.id] = { ...ret[lineShape.id], body };
      });
    }

    return ret;
  }

  return { onModified };
}
export type ConnectedLineHandler = ReturnType<typeof newConnectedLineHandler>;

interface DetachOption {
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">;
}

export function newConnectedLineDetouchHandler(option: DetachOption) {
  /**
   * Returns patched properties that are updated in this function.
   * => Returned value doesn't inherit the content of "updatedMap".
   */
  function onModified(updatedMap: { [id: string]: Partial<Shape> }): {
    [id: string]: Partial<LineShape>;
  } {
    const ret: { [id: string]: Partial<LineShape> } = {};

    const shapeComposite = option.ctx.getShapeComposite();
    const shapeMap = shapeComposite.shapeMap;
    const updatedShapeMap: { [id: string]: Shape } = {};
    mapEach(updatedMap, (patch, id) => {
      if (shapeMap[id]) {
        updatedShapeMap[id] = { ...shapeMap[id], ...patch };
      }
    });

    // Update connections
    mapEach(updatedShapeMap, (shape) => {
      // When a line is modified but connected shapes doesn't, the connections should be deleted.
      if (isLineShape(shape)) {
        if (shape.pConnection && !updatedShapeMap[shape.pConnection.id]) {
          ret[shape.id] ??= {};
          ret[shape.id].pConnection = undefined;
        }
        if (shape.qConnection && !updatedShapeMap[shape.qConnection.id]) {
          ret[shape.id] ??= {};
          ret[shape.id].qConnection = undefined;
        }
        if (shape.body) {
          shape.body.forEach((b, i) => {
            if (b.c && !updatedShapeMap[b.c.id]) {
              ret[shape.id] ??= {};
              if (!ret[shape.id].body) {
                ret[shape.id].body = shape.body!.concat();
              }
              const next = { ...ret[shape.id].body![i] };
              delete next.c;
              ret[shape.id].body![i] = next;
            }
          });
        }
        return;
      }
    });

    return ret;
  }

  return { onModified };
}
export type ConnectedLineDetouchHandler = ReturnType<typeof newConnectedLineDetouchHandler>;

export function getConnectedLineInfoMap(
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">,
  connectedTargetIds: string[],
): {
  [id: string]: LineShape[];
} {
  const shapeMap = ctx.getShapeComposite().shapeMap;
  const targetIds = new Set(connectedTargetIds);
  const connectedLineInfoMap: { [id: string]: LineShape[] } = {};

  mapEach(shapeMap, (line) => {
    if (!isLineShape(line)) return;

    // Gather connected lines without duplication
    const saved = new Set<string>();
    getConnections(line).forEach((connection) => {
      if (connection && !saved.has(connection.id) && (targetIds.has(connection.id) || targetIds.has(line.id))) {
        saved.add(connection.id);
        connectedLineInfoMap[connection.id] ??= [];
        connectedLineInfoMap[connection.id].push(line);
      }
    });
  });

  return connectedLineInfoMap;
}

export function getRotatedRectPathMap(
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">,
  updatedMap: { [id: string]: Partial<Shape> },
): {
  [id: string]: RotatedRectPath;
} {
  const shapeComposite = ctx.getShapeComposite();
  const shapeMap = shapeComposite.shapeMap;
  const modifiedMap: { [id: string]: RotatedRectPath } = {};
  mapEach(updatedMap, (shape, id) => {
    const s = shapeMap[id];
    if (s) {
      const merged = { ...s, ...shape };
      modifiedMap[id] = [shapeComposite.getLocalRectPolygon(merged), merged.rotation];
    }
  });
  return modifiedMap;
}

export interface ConnectionRenderer {
  render(ctx: CanvasCTX, patchMap: { [id: string]: Partial<Shape> }, style: StyleScheme, scale: number): void;
  setRigidLineIds(ids: string[]): void;
}
export function newConnectionRenderer(option: {
  connectedLinesMap: { [id: string]: LineShape[] };
  excludeIdSet?: Set<string>;
}): ConnectionRenderer {
  const indirectLineIds = new Set<string>();
  mapEach(option.connectedLinesMap, (lines) => {
    lines.forEach((l) => {
      if (!option.excludeIdSet?.has(l.id)) {
        indirectLineIds.add(l.id);
      }
    });
  });

  let rigidLineIds = new Set<string>();
  function setRigidLineIds(ids: string[]) {
    rigidLineIds = new Set(ids);
  }

  function render(ctx: CanvasCTX, patchMap: { [id: string]: Partial<Shape> }, style: StyleScheme, scale: number) {
    renderPatchedVertices(ctx, {
      lines: mapFilter(patchMap, (_, id) => indirectLineIds.has(id)),
      rigidIds: rigidLineIds,
      style,
      scale,
    });
  }

  return { render, setRigidLineIds };
}

function renderPatchedVertices(
  ctx: CanvasCTX,
  option: { lines: { [id: string]: Partial<LineShape> }; rigidIds?: Set<string>; scale: number; style: StyleScheme },
) {
  applyFillStyle(ctx, { color: option.style.selectionSecondaly });
  applyStrokeStyle(ctx, { color: option.style.selectionPrimary, width: 2 * option.scale });
  const size = 5 * option.scale;

  mapEach(option.lines, (l, id) => {
    if (l.p) {
      ctx.beginPath();
      ctx.arc(l.p.x, l.p.y, size, 0, TAU);
      ctx.fill();
      if (option.rigidIds?.has(id)) ctx.stroke();
    }
    if (l.q) {
      ctx.beginPath();
      ctx.arc(l.q.x, l.q.y, size, 0, TAU);
      ctx.fill();
      if (option.rigidIds?.has(id)) ctx.stroke();
    }
    if (l.body) {
      l.body.forEach((b) => {
        if (b.c) {
          ctx.beginPath();
          ctx.arc(b.p.x, b.p.y, size, 0, TAU);
          ctx.fill();
          if (option.rigidIds?.has(id)) ctx.stroke();
        }
      });
    }
  });
}

function getElbowConnectedShapeIds(lines: LineShape[]): string[] {
  const ret = new Set<string>();

  lines.forEach((line) => {
    if (line.lineType !== "elbow") return;

    if (line.pConnection) {
      ret.add(line.pConnection.id);
    }

    if (line.qConnection) {
      ret.add(line.qConnection.id);
    }
  });

  return Array.from(ret.keys());
}

export function getConnectedLinePatch(srcComposite: ShapeComposite, patchInfo: EntityPatchInfo<Shape>) {
  if (!patchInfo.update) return {};

  const connectedLinesMap = getConnectedLineInfoMap(
    { getShapeComposite: () => srcComposite },
    Object.keys(patchInfo.update),
  );
  const handler = newConnectedLineHandler({
    connectedLinesMap,
    ctx: { getShapeComposite: () => srcComposite },
  });
  return handler.onModified(patchInfo.update);
}

/**
 * Migrate each connection not to translate the corresponding vertex.
 * This takes care of connections that are directly connected to the shapes in "patchMap".
 * When the line is included in "patchMap", it's exempted from preservation.
 */
export function preserveLineConnections(shapeComposite: ShapeComposite, patchMap: { [id: string]: Partial<Shape> }) {
  const shapeMap = shapeComposite.shapeMap;
  const ids = Object.keys(patchMap).filter((id) => shapeMap[id] && !isLineShape(shapeMap[id]));
  if (ids.length === 0) return {};

  const nextPatch = {} as { [id: string]: Partial<LineShape> };
  const connectionInfoMap = getConnectedLineInfoMap({ getShapeComposite: () => shapeComposite }, ids);
  const currentShapeComposite = getNextShapeComposite(shapeComposite, { update: patchMap });
  ids.forEach((id) => {
    connectionInfoMap[id]?.forEach((line) => {
      if (patchMap[line.id]) return;

      const srcLine = shapeMap[line.id] as LineShape;
      const srcVertices = getLinePath(srcLine);
      const patchInfo = getConnections(line).map<[number, IVec2, ConnectionPoint | undefined]>((c, i) => {
        const srcVertex = srcVertices[i];
        const targetShape = c ? currentShapeComposite.shapeMap[c.id] : undefined;
        if (!c || !targetShape || !patchMap[c.id]) return [i, srcVertex, c];

        return [i, srcVertex, { ...c, rate: currentShapeComposite.getLocationRateOnShape(targetShape, srcVertex) }];
      });
      nextPatch[line.id] = patchVertices(srcLine, patchInfo);
    });
  });
  return nextPatch;
}
