import { IVec2, getCenter, getDistance, isOnPolygon, rotate } from "okageo";
import { RectangleShape } from "./rectangle";
import { ShapeStruct } from "./core";
import {
  getClosestOutlineOnPolygon,
  getIntersectedOutlinesOnPolygon,
  getMarkersOnPolygon,
  getRotateFn,
} from "../utils/geometry";
import { applyFillStyle } from "../utils/fillStyle";
import { applyStrokeStyle } from "../utils/strokeStyle";

export function getStructForSimplePolygon<T extends RectangleShape>(
  getPath: (shape: T) => IVec2[],
): Pick<ShapeStruct<T>, "render" | "isPointOn" | "getClosestOutline" | "getIntersectedOutlines"> {
  return {
    render(ctx, shape) {
      if (shape.fill.disabled && shape.stroke.disabled) return;

      const center = { x: shape.p.x + shape.width / 2, y: shape.p.y + shape.height / 2 };
      const rotateFn = getRotateFn(shape.rotation, center);
      const path = getPath(shape).map((p) => rotateFn(p));

      ctx.beginPath();
      path.forEach((p) => {
        ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      if (!shape.fill.disabled) {
        applyFillStyle(ctx, shape.fill);
        ctx.fill();
      }
      if (!shape.stroke.disabled) {
        applyStrokeStyle(ctx, shape.stroke);
        ctx.stroke();
      }
    },
    isPointOn(shape, p) {
      const center = { x: shape.p.x + shape.width / 2, y: shape.p.y + shape.height / 2 };
      const rotatedP = rotate(p, -shape.rotation, center);
      return isOnPolygon(rotatedP, getPath(shape));
    },
    getClosestOutline(shape, p, threshold) {
      const path = getPath(shape);
      const center = getCenter(path[0], path[2]);
      const rotateFn = getRotateFn(shape.rotation, center);
      const rotatedP = rotateFn(p, true);

      {
        const rotatedClosest = getMarkersOnPolygon(path).find((m) => getDistance(m, rotatedP) <= threshold);
        if (rotatedClosest) return rotateFn(rotatedClosest);
      }

      {
        const rotatedClosest = getClosestOutlineOnPolygon(path, rotatedP, threshold);
        if (rotatedClosest) return rotateFn(rotatedClosest);
      }
    },
    getIntersectedOutlines(shape, from, to) {
      const center = { x: shape.p.x + shape.width / 2, y: shape.p.y + shape.height / 2 };
      const rotateFn = getRotateFn(shape.rotation, center);
      const path = getPath(shape).map((p) => rotateFn(p));
      return getIntersectedOutlinesOnPolygon(path, from, to);
    },
  };
}
