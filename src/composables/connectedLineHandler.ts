import { LineShape } from "../shapes/line";
import { RotatedRectPath, getLocationFromRateOnRectPath } from "../utils/geometry";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { Shape, StyleScheme } from "../models";
import { getLocalRectPolygon } from "../shapes";
import { applyFillStyle } from "../utils/fillStyle";

interface Option {
  connectedLinesMap: {
    [id: string]: LineShape[];
  };
}

export function newConnectedLineHandler(option: Option) {
  function getModifiedMap(modifiedRectPathMap: { [id: string]: RotatedRectPath }): {
    [id: string]: Partial<LineShape>;
  } {
    const ret: { [id: string]: Partial<LineShape> } = {};

    Object.entries(modifiedRectPathMap).forEach(([id, [rectPath, rotation]]) => {
      const infos = option.connectedLinesMap[id] ?? [];
      infos.forEach((line) => {
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
      });
    });

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
      if (selectedIdMap[line.id]) return false;
      if (line.pConnection && selectedIdMap[line.pConnection.id]) {
        connectedLineInfoMap[line.pConnection.id] ??= [];
        connectedLineInfoMap[line.pConnection.id].push(line);
      }
      if (line.qConnection && selectedIdMap[line.qConnection.id]) {
        connectedLineInfoMap[line.qConnection.id] ??= [];
        connectedLineInfoMap[line.qConnection.id].push(line);
      }
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
