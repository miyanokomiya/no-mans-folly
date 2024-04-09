import { IRectangle } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getDirectionalSimplePath, getStructForSimplePolygon } from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";

export type TriangleShape = SimplePolygonShape & {
  cr?: number; // 0 by default
};

export const struct: ShapeStruct<TriangleShape> = {
  ...getStructForSimplePolygon<TriangleShape>(getPath),
  label: "Triangle",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "triangle",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      cr: arg.cr,
      direction: arg.direction,
    };
  },
  getTextRangeRect(shape) {
    let rect: IRectangle;
    switch (shape.direction) {
      case 0: {
        rect = {
          x: shape.p.x + shape.width / 2,
          y: shape.p.y + shape.height * 0.25,
          width: shape.width / 2,
          height: shape.height / 2,
        };
        break;
      }
      case 2: {
        rect = {
          x: shape.p.x,
          y: shape.p.y + shape.height * 0.25,
          width: shape.width / 2,
          height: shape.height / 2,
        };
        break;
      }
      case 3: {
        rect = {
          x: shape.p.x + shape.width * 0.25,
          y: shape.p.y,
          width: shape.width / 2,
          height: shape.height / 2,
        };
        break;
      }
      default: {
        rect = {
          x: shape.p.x + shape.width * 0.25,
          y: shape.p.y + shape.height / 2,
          width: shape.width / 2,
          height: shape.height / 2,
        };
        break;
      }
    }
    return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
  },
  canAttachSmartBranch: true,
};

function getPath(src: TriangleShape): SimplePath {
  return getDirectionalSimplePath(src, getRawPath);
}

function getRawPath(shape: TriangleShape): SimplePath {
  const path = [
    { x: shape.width / 2, y: 0 },
    { x: shape.width, y: shape.height },
    { x: 0, y: shape.height },
  ];
  return { path };
}
