import { LineShape } from "../shapes/line";
import { RotatedRectPath, getLocationFromRateOnRectPath } from "../utils/geometry";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { Shape, StyleScheme } from "../models";
import { getLocalRectPolygon } from "../shapes";
import { applyFillStyle } from "../utils/fillStyle";
import { newElbowLineHandler } from "./elbowLineHandler";

interface Option {
  connectedLinesMap: {
    [id: string]: LineShape[];
  };
  ctx: Pick<AppCanvasStateContext, "getShapeMap" | "getShapeStruct">;
}

export function newConnectedLineHandler(option: Option) {
  function getModifiedMap(updatedMap: { [id: string]: Partial<Shape> }): {
    [id: string]: Partial<LineShape>;
  } {
    const ret: { [id: string]: Partial<LineShape> } = {};

    const shapeMap = option.ctx.getShapeMap();
    const updatedShapeMap: { [id: string]: Shape } = {};
    Object.entries(updatedMap).forEach(([id, patch]) => {
      updatedShapeMap[id] = { ...shapeMap[id], ...patch };
    });

    // Update connections
    Object.entries(updatedShapeMap).forEach(([id, shape]) => {
      const rectPath = getLocalRectPolygon(option.ctx.getShapeStruct, shape);
      const rotation = shape.rotation;

      const lines = option.connectedLinesMap[id] ?? [];
      lines.forEach((line) => {
        if (line.pConnection?.id === id) {
          const p = getLocationFromRateOnRectPath(rectPath, rotation, line.pConnection.rate);
          ret[line.id] ??= {};
          ret[line.id].p = p;
        }
        if (line.qConnection?.id === id) {
          const q = getLocationFromRateOnRectPath(rectPath, rotation, line.qConnection.rate);
          ret[line.id] ??= {};
          ret[line.id].q = q;
        }

        if (line.body) {
          line.body.forEach((b, i) => {
            if (b.c?.id === id) {
              const next = { ...b, p: getLocationFromRateOnRectPath(rectPath, rotation, b.c.rate) };
              ret[line.id] ??= {};
              ret[line.id].body ??= line.body!.concat();
              ret[line.id].body![i] = next;
            }
          });
        }
      });
    });

    // Update elbow bodies
    {
      const patchedLines = Object.entries(ret)
        .map<LineShape>(([id, patch]) => {
          const original = shapeMap[id] as LineShape;
          return { ...original, ...patch };
        })
        .filter((l) => l.lineType === "elbow");
      const nextShapeMap: { [id: string]: Shape } = {};
      const elbowConnectedIds = getElbowConnectedShapeIds(patchedLines);
      elbowConnectedIds.forEach((id) => {
        nextShapeMap[id] = { ...shapeMap[id], ...(updatedMap[id] ?? {}) };
      });
      patchedLines.forEach((line) => {
        nextShapeMap[line.id] = line;
      });

      const elbowHandler = newElbowLineHandler({
        getShapeStruct: option.ctx.getShapeStruct,
        getShapeMap: () => nextShapeMap,
      });

      patchedLines.forEach((lineShape) => {
        const body = elbowHandler.optimizeElbow(lineShape);
        ret[lineShape.id] = { ...ret[lineShape.id], body };
      });
    }

    return ret;
  }

  return { onModified: getModifiedMap };
}
export type ConnectedLineHandler = ReturnType<typeof newConnectedLineHandler>;

export function getConnectedLineInfoMap(ctx: Pick<AppCanvasStateContext, "getShapeMap" | "getSelectedShapeIdMap">): {
  [id: string]: LineShape[];
} {
  const shapeMap = ctx.getShapeMap();
  const selectedIdMap = ctx.getSelectedShapeIdMap();
  const connectedLineInfoMap: { [id: string]: LineShape[] } = {};
  Object.values(shapeMap)
    .filter((s): s is LineShape => s.type === "line")
    .forEach((line) => {
      if (line.pConnection && selectedIdMap[line.pConnection.id]) {
        connectedLineInfoMap[line.pConnection.id] ??= [];
        connectedLineInfoMap[line.pConnection.id].push(line);
      }
      if (line.qConnection && selectedIdMap[line.qConnection.id]) {
        connectedLineInfoMap[line.qConnection.id] ??= [];
        connectedLineInfoMap[line.qConnection.id].push(line);
      }

      line.body?.some((b) => {
        if (b.c && selectedIdMap[b.c.id]) {
          connectedLineInfoMap[b.c.id] ??= [];
          connectedLineInfoMap[b.c.id].push(line);
          return true;
        }
      });
    });

  return connectedLineInfoMap;
}

export function getRotatedRectPathMap(
  ctx: Pick<AppCanvasStateContext, "getShapeStruct" | "getShapeMap">,
  updatedMap: { [id: string]: Partial<Shape> }
): {
  [id: string]: RotatedRectPath;
} {
  const shapeMap = ctx.getShapeMap();
  const modifiedMap: { [id: string]: RotatedRectPath } = {};
  Object.entries(updatedMap).forEach(([id, shape]) => {
    const s = shapeMap[id];
    if (s) {
      const merged = { ...s, ...shape };
      modifiedMap[id] = [getLocalRectPolygon(ctx.getShapeStruct, merged), merged.rotation];
    }
  });
  return modifiedMap;
}

export function renderPatchedVertices(
  ctx: CanvasRenderingContext2D,
  option: { lines: Partial<LineShape>[]; scale: number; style: StyleScheme }
) {
  applyFillStyle(ctx, { color: option.style.selectionSecondaly });
  const size = 5 * option.scale;

  option.lines.forEach((l) => {
    if (l.p) {
      ctx.beginPath();
      ctx.arc(l.p.x, l.p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    if (l.q) {
      ctx.beginPath();
      ctx.arc(l.q.x, l.q.y, size, 0, Math.PI * 2);
      ctx.fill();
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
