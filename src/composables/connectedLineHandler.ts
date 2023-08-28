import { IVec2 } from "okageo";
import { Shape } from "../models";
import { LineShape } from "../shapes/line";
import { getLocationFromRateOnRectPath } from "../utils/geometry";

interface Option {
  lineShapes: LineShape[];
  connectedShapes: Shape[];
}

export function newConnectedLineHandler(option: Option) {
  function getModifiedMap(modifiedRectPathMap: { [id: string]: [path: IVec2[], rotation: number] }) {
    const ret: { [id: string]: Partial<LineShape> } = {};

    Object.entries(modifiedRectPathMap).forEach(([id, [rectPath, rotation]]) => {
      option.lineShapes.forEach((lineShape) => {
        if (lineShape.pConnection?.id === id) {
          const p = getLocationFromRateOnRectPath(rectPath, rotation, lineShape.pConnection.rate);
          ret[lineShape.id] = { p };
        }
        if (lineShape.qConnection?.id === id) {
          const q = getLocationFromRateOnRectPath(rectPath, rotation, lineShape.qConnection.rate);
          if (ret[lineShape.id]) {
            ret[lineShape.id].q = q;
          } else {
            ret[lineShape.id] = { q };
          }
        }
      });
    });

    return ret;
  }

  return { onModified: getModifiedMap };
}
export type ConnectedLineHandler = ReturnType<typeof newConnectedLineHandler>;
