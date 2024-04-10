import { IVec2 } from "okageo";
import { ShapeStruct, createBaseShape } from "../core";
import {
  SimplePath,
  SimplePolygonShape,
  getDirectionalSimplePath,
  getSimpleShapeTextRangeRect,
  getStructForSimplePolygon,
} from "../simplePolygon";
import { createBoxPadding } from "../../utils/boxPadding";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { getWavePathControl } from "../../utils/path";

export type DocumentSymbolShape = SimplePolygonShape & {
  c0: IVec2;
};

export const struct: ShapeStruct<DocumentSymbolShape> = {
  ...getStructForSimplePolygon<DocumentSymbolShape>(getPath, {
    getOutlineSnaps: (shape) => {
      const l = { x: 0, y: shape.height / 2 };
      const t = { x: shape.width / 2, y: 0 };
      const r = { x: shape.width, y: shape.height / 2 };
      const b = { x: shape.width / 2, y: shape.height };

      switch (shape.direction) {
        case 0: {
          const size = shape.width * (1 - shape.c0.y);
          return [b, t, l, { x: shape.width - size / 2, y: l.y }];
        }
        case 2: {
          const size = shape.width * (1 - shape.c0.y);
          return [t, b, r, { x: size / 2, y: l.y }];
        }
        case 3: {
          const size = shape.height * (1 - shape.c0.y);
          return [l, b, r, { x: b.x, y: size / 2 }];
        }
        default: {
          const size = shape.height * (1 - shape.c0.y);
          return [l, t, r, { x: b.x, y: shape.height - size / 2 }];
        }
      }
    },
  }),
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
    return getSimpleShapeTextRangeRect(shape, (s) => {
      const size = s.height * (1 - s.c0.y);
      return {
        x: s.p.x,
        y: s.p.y,
        width: s.width,
        height: s.height - size,
      };
    });
  },
  canAttachSmartBranch: true,
};

function getPath(src: DocumentSymbolShape): SimplePath {
  return getDirectionalSimplePath(src, getRawPath);
}

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
    curves: [undefined, undefined, getWavePathControl({ x: shape.width, y: baseY }, { x: 0, y: baseY }, size)],
  };
}
