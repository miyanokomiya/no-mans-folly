import { LineShape } from "../shapes/line";
import { RotatedRectPath, getLocationFromRateOnRectPath } from "../utils/geometry";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { Shape } from "../models";
import { getLocalRectPolygon } from "../shapes";

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
          ret[line.id] = { p };
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
    if (s) modifiedMap[id] = [getLocalRectPolygon(ctx.getShapeStruct, { ...s, ...shape }), s.rotation];
  });
  return modifiedMap;
}
