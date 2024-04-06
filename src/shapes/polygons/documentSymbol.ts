import { IRectangle, IVec2 } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import { SimplePath, SimplePolygonShape, getDirectionalSimplePath, getStructForSimplePolygon } from "../simplePolygon";
import { createBoxPadding, getPaddingRect } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";

export type DocumentSymbolShape = SimplePolygonShape & {
  c0: IVec2;
};

export const struct: ShapeStruct<DocumentSymbolShape> = {
  ...getStructForSimplePolygon<DocumentSymbolShape>(getPath, { outlineSnap: "trbl" }),
  label: "Document",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "document_symbol",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
      width: arg.width ?? 100,
      height: arg.height ?? 100,
      textPadding: arg.textPadding ?? createBoxPadding([2, 2, 2, 2]),
      c0: arg.c0 ?? { x: 0.75, y: 0.8 },
    };
  },
  getTextRangeRect(shape) {
    let rect: IRectangle;
    switch (shape.direction) {
      case 0: {
        const size = shape.width * (1 - shape.c0.y);
        rect = {
          x: shape.p.x,
          y: shape.p.y,
          width: shape.width - size,
          height: shape.height,
        };
        break;
      }
      case 2: {
        const size = shape.width * (1 - shape.c0.y);
        rect = {
          x: shape.p.x + size,
          y: shape.p.y,
          width: shape.width - size,
          height: shape.height,
        };
        break;
      }
      case 3: {
        const size = shape.height * (1 - shape.c0.y);
        rect = {
          x: shape.p.x,
          y: shape.p.y + size,
          width: shape.width,
          height: shape.height - size,
        };
        break;
      }
      default: {
        const size = shape.height * (1 - shape.c0.y);
        rect = {
          x: shape.p.x,
          y: shape.p.y,
          width: shape.width,
          height: shape.height - size,
        };
        break;
      }
    }

    return shape.textPadding ? getPaddingRect(shape.textPadding, rect) : rect;
  },
  canAttachSmartBranch: true,
};

function getPath(src: DocumentSymbolShape): SimplePath {
  return getDirectionalSimplePath(src, getRawPath);
}

// Ref: https://math.stackexchange.com/questions/4235124/getting-the-most-accurate-bezier-curve-that-plots-a-sine-wave
const v = Math.sqrt(3) * 2;
const u = (8 / 3 - Math.sqrt(3)) / 2;
function getRawPath(shape: DocumentSymbolShape): SimplePath {
  const size = shape.height * (1 - shape.c0.y);
  const halfSize = size / 2;
  const baseY = shape.height - halfSize;

  return {
    path: [
      { x: 0, y: 0 },
      { x: shape.width, y: 0 },
      { x: shape.width, y: baseY },
      { x: 0, y: baseY },
    ],
    curves: [
      undefined,
      undefined,
      {
        c1: { x: shape.width * (1 - u), y: baseY - halfSize * v },
        c2: { x: shape.width * u, y: baseY + halfSize * v },
      },
    ],
  };
}
