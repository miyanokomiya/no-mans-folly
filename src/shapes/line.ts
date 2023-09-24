import { AffineMatrix, IVec2, applyAffine, getOuterRectangle, getRadian, isSame, multiAffines } from "okageo";
import { ConnectionPoint, FillStyle, LineHead, Shape, StrokeStyle } from "../models";
import { applyFillStyle, createFillStyle } from "../utils/fillStyle";
import { ISegment, expandRect, getRectPoints, isPointCloseToSegment } from "../utils/geometry";
import { applyStrokeStyle, createStrokeStyle, getStrokeWidth } from "../utils/strokeStyle";
import { ShapeStruct, createBaseShape, getCommonStyle, updateCommonStyle } from "./core";
import { clipLineHead, renderLineHead } from "./lineHeads";
import { applyPath } from "../utils/renderer";
import { isTextShape } from "./text";
import { struct as textStruct } from "./text";

export type LineType = undefined | "elbow";

export interface LineShape extends Shape {
  fill: FillStyle;
  stroke: StrokeStyle;
  q: IVec2;
  pConnection?: ConnectionPoint;
  qConnection?: ConnectionPoint;
  pHead?: LineHead;
  qHead?: LineHead;
  body?: { p: IVec2; c?: ConnectionPoint }[];
  lineType?: LineType;
}

export const struct: ShapeStruct<LineShape> = {
  label: "Line",
  create(arg = {}) {
    const obj: LineShape = {
      ...createBaseShape(arg),
      type: "line",
      rotation: 0, // should always be "0" or just ignored
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle({ width: 2 }),
      q: arg.q ?? { x: 100, y: 0 },
      body: arg.body,
      lineType: arg.lineType,
    };
    if (arg.pConnection) obj.pConnection = arg.pConnection;
    if (arg.qConnection) obj.qConnection = arg.qConnection;
    return obj;
  },
  render(ctx, shape, shapeMap, treeNode) {
    applyStrokeStyle(ctx, shape.stroke);
    applyFillStyle(ctx, shape.fill);
    const linePath = getLinePath(shape);
    const hasLabels = treeNode && treeNode.children.length > 0;

    let pAffine: AffineMatrix | undefined;
    if (shape.pHead) {
      const p = linePath[0];
      const r = getRadian(p, linePath[1]);
      const sin = Math.sin(r);
      const cos = Math.cos(r);
      pAffine = multiAffines([
        [1, 0, 0, 1, p.x, p.y],
        [cos, sin, -sin, cos, 0, 0],
      ]);
    }

    let qAffine: AffineMatrix | undefined;
    if (shape.qHead) {
      const q = linePath[linePath.length - 1];
      const r = getRadian(q, linePath[linePath.length - 2]);
      const sin = Math.sin(r);
      const cos = Math.cos(r);
      qAffine = multiAffines([
        [1, 0, 0, 1, q.x, q.y],
        [cos, sin, -sin, cos, 0, 0],
      ]);
    }

    let region: Path2D | undefined;

    if (pAffine || qAffine || hasLabels) {
      const wrapper = getOuterRectangle([getLinePath(shape)]);
      const outline = expandRect(wrapper, (shape.stroke.width ?? 1) * 4 + 40);
      region = new Path2D();
      region.rect(outline.x, outline.y, outline.width, outline.height);
    }

    if (region && pAffine) {
      clipLineHead(region, shape.pHead!, pAffine, ctx.lineWidth);
    }

    if (region && qAffine) {
      clipLineHead(region, shape.qHead!, qAffine, ctx.lineWidth);
    }

    if (region && hasLabels) {
      treeNode.children.forEach((n) => {
        const label = shapeMap[n.id];
        if (label && isTextShape(label)) {
          applyPath(region!, textStruct.getLocalRectPolygon(label));
        }
      });
    }

    if (region) {
      ctx.save();
      ctx.clip(region, "evenodd");
    }

    ctx.beginPath();
    applyPath(ctx, linePath);
    applyStrokeStyle(ctx, { ...shape.stroke, color: shape.fill.color });
    ctx.stroke();
    applyStrokeStyle(ctx, { ...shape.stroke, width: ctx.lineWidth * 0.8 });
    ctx.stroke();

    if (region) {
      ctx.restore();
    }

    if (region && pAffine) {
      renderLineHead(ctx, shape.pHead!, pAffine, ctx.lineWidth);
    }

    if (region && qAffine) {
      renderLineHead(ctx, shape.qHead!, qAffine, ctx.lineWidth);
    }
  },
  getWrapperRect(shape, includeBounds) {
    let rect = getOuterRectangle([getLinePath(shape)]);
    if (includeBounds) {
      // FIXME: This expanding isn't perfect nor deals with heads.
      rect = expandRect(rect, getStrokeWidth(shape.stroke) / 2);
    }
    return rect;
  },
  getLocalRectPolygon(shape) {
    return getRectPoints(getOuterRectangle([getLinePath(shape)]));
  },
  isPointOn(shape, p) {
    return getEdges(shape).some((seg) => isPointCloseToSegment(seg, p, 10));
  },
  resize(shape, resizingAffine) {
    const [p, q] = [shape.p, shape.q].map((p) => applyAffine(resizingAffine, p));
    const body = shape.body?.map((b) => ({ ...b, p: applyAffine(resizingAffine, b.p) }));

    const ret: Partial<LineShape> = {};
    if (!isSame(p, shape.p)) ret.p = p;
    if (!isSame(q, shape.q)) ret.q = q;
    if (body?.some((b, i) => !isSame(b.p, shape.body![i].p))) ret.body = body;

    return ret;
  },
  getCommonStyle,
  updateCommonStyle,
  immigrateShapeIds(shape, oldToNewIdMap, removeNotFound) {
    const ret: Partial<LineShape> = {};

    if (shape.pConnection) {
      if (oldToNewIdMap[shape.pConnection.id]) {
        ret.pConnection = { ...shape.pConnection, id: oldToNewIdMap[shape.pConnection.id] };
      } else if (removeNotFound) {
        ret.pConnection = undefined;
      }
    }

    if (shape.qConnection) {
      if (oldToNewIdMap[shape.qConnection.id]) {
        ret.qConnection = { ...shape.qConnection, id: oldToNewIdMap[shape.qConnection.id] };
      } else if (removeNotFound) {
        ret.qConnection = undefined;
      }
    }

    let bodyChanged = false;
    const body = shape.body?.map((b) => {
      if (b.c?.id) {
        bodyChanged = true;
        if (oldToNewIdMap[b.c.id]) {
          return { p: b.p, c: { ...b.c, id: oldToNewIdMap[b.c.id] } };
        } else {
          return { p: b.p };
        }
      }
      return b;
    });
    if (bodyChanged) {
      ret.body = body;
    }

    return ret;
  },
  refreshRelation(shape, availableIdSet) {
    const ret: Partial<LineShape> = {};

    if (shape.pConnection && !availableIdSet.has(shape.pConnection.id)) {
      ret.pConnection = undefined;
    }

    if (shape.qConnection && !availableIdSet.has(shape.qConnection.id)) {
      ret.qConnection = undefined;
    }

    let bodyChanged = false;
    const body = shape.body?.map((b) => {
      if (b.c?.id && !availableIdSet.has(b.c.id)) {
        bodyChanged = true;
        return { p: b.p };
      }
      return b;
    });
    if (bodyChanged) {
      ret.body = body;
    }

    return Object.keys(ret).length > 0 ? ret : undefined;
  },
  getSnappingLines(shape) {
    const path = getLinePath(shape);
    return {
      h: path.map((p) => [p, p]),
      v: path.map((p) => [p, p]),
    };
  },
};

export function getLinePath(shape: LineShape): IVec2[] {
  return [shape.p, ...(shape.body?.map((b) => b.p) ?? []), shape.q];
}

export function getEdges(shape: LineShape): ISegment[] {
  const path = getLinePath(shape);
  const ret: ISegment[] = [];
  path.map((v, i) => {
    if (i === path.length - 1) return;
    ret.push([v, path[i + 1]]);
  });
  return ret;
}

// When "c" is "undefined", the connection will be deleted.
export function patchVertex(
  shape: LineShape,
  index: number,
  p: IVec2,
  c: ConnectionPoint | undefined
): Partial<LineShape> {
  const vertices = getLinePath(shape);
  switch (index) {
    case 0:
      return { p, pConnection: c };
    case vertices.length - 1:
      return { q: p, qConnection: c };
    default:
      return shape.body ? { body: shape.body.map((b, i) => (i + 1 === index ? { ...b, p, c } : b)) } : {};
  }
}

export function patchConnection(shape: LineShape, index: number, connection?: ConnectionPoint): Partial<LineShape> {
  const vertices = getLinePath(shape);
  switch (index) {
    case 0: {
      if (!shape.pConnection && !connection) return {};
      if (shape.pConnection && !connection) return { pConnection: undefined };
      return { pConnection: connection };
    }
    case vertices.length - 1: {
      if (!shape.qConnection && !connection) return {};
      if (shape.qConnection && !connection) return { qConnection: undefined };
      return { qConnection: connection };
    }
    default: {
      if (!shape.body) {
        return {};
      } else {
        const next = shape.body.concat();
        if (!next[index - 1]) return {};

        next[index - 1] = { ...next[index - 1], c: connection };
        return { body: next };
      }
    }
  }
}

export function getConnection(shape: LineShape, index: number): ConnectionPoint | undefined {
  const vertices = getLinePath(shape);
  switch (index) {
    case 0:
      return shape.pConnection;
    case vertices.length - 1:
      return shape.qConnection;
    default:
      return shape.body?.[index - 1].c;
  }
}

export function addNewVertex(shape: LineShape, index: number, p: IVec2, c?: ConnectionPoint): Partial<LineShape> {
  switch (index) {
    case 0:
      return {};
    default:
      if (shape.body) {
        const body = [...shape.body.slice(0, index - 1), { p, c }, ...shape.body.slice(index - 1)];
        return { body };
      } else {
        return { body: [{ p, c }] };
      }
  }
}

/**
 * Only inner vertices can be deleted.
 */
export function deleteVertex(shape: LineShape, index: number): Partial<LineShape> {
  if (!shape.body) return {};

  const vertices = getLinePath(shape);
  if (0 === index || index === vertices.length - 1) return {};

  return { body: shape.body.filter((_, i) => i !== index - 1) };
}

export function isLineShape(shape: Shape): shape is LineShape {
  return shape.type === "line";
}
