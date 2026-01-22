import {
  applyAffine,
  getCenter,
  getDistance,
  getRadian,
  getRectCenter,
  IRectangle,
  isSame,
  pathSegmentRawsToString,
} from "okageo";
import { CommonStyle, Shape, Size } from "../../models";
import { findexSortFn, toMap } from "../../utils/commons";
import { ShapeStruct, createBaseShape, getCommonStyle, updateCommonStyle } from "../core";
import {
  expandRect,
  getIntersectedOutlinesOnPolygon,
  getPointLerpSlope,
  getRectPoints,
  getRotatedRectAffine,
  getRotatedWrapperRect,
  getRotateFn,
  getSegments,
  ISegment,
  isPointOnRectangleRotated,
  isSameValue,
} from "../../utils/geometry";
import { renderTransform } from "../../utils/svgElements";
import { getClosestPointOnPolyline, getPolylineEdgeInfo } from "../../utils/path";
import { getClosestOutlineForRect } from "../rectPolygon";
import { generateNKeysBetweenAllowSame } from "../../utils/findex";
import { applyLocalSpace, applyPath, createSVGCurvePath } from "../../utils/renderer";
import {
  applyStrokeStyle,
  createStrokeStyle,
  getStrokeWidth,
  renderStrokeSVGAttributes,
} from "../../utils/strokeStyle";
import { applyFillStyle, createFillStyle, renderFillSVGAttributes } from "../../utils/fillStyle";

const DEFAULT_CELL_WIDTH = 100;
const DEFAULT_CELL_HEIGHT = 50;

export type TableColumnKey = `c_${string}`;
export type TableRowKey = `r_${string}`;

export type TableColumn = {
  id: TableColumnKey;
  size: number;
  findex: string;
};

export type TableRow = {
  id: TableRowKey;
  size: number;
  findex: string;
};

export type TableShape = Shape &
  CommonStyle & {
    [K in TableColumnKey]?: TableColumn;
  } & {
    [K in TableRowKey]?: TableRow;
  };

/**
 * Detailed table info derived from a table shape
 */
export type TableShapeInfo = {
  columns: TableColumn[];
  rows: TableRow[];
};

export const struct: ShapeStruct<TableShape> = {
  label: "Table",
  create(arg = {}) {
    const info = getTableShapeInfo(arg);
    const ret = {
      ...createBaseShape(arg),
      type: "table",
      fill: arg.fill ?? createFillStyle(),
      stroke: arg.stroke ?? createStrokeStyle(),
    };
    if (info) {
      return { ...ret, ...toMap(info.columns), ...toMap(info.rows) };
    } else {
      const findexList = generateNKeysBetweenAllowSame(undefined, undefined, 6);
      return {
        ...ret,
        c_0: { id: "c_0", size: DEFAULT_CELL_WIDTH, findex: findexList[0] },
        c_1: { id: "c_1", size: DEFAULT_CELL_WIDTH, findex: findexList[1] },
        c_2: { id: "c_2", size: DEFAULT_CELL_WIDTH, findex: findexList[2] },
        r_0: { id: "r_0", size: DEFAULT_CELL_HEIGHT, findex: findexList[3] },
        r_1: { id: "r_1", size: DEFAULT_CELL_HEIGHT, findex: findexList[4] },
        r_2: { id: "r_2", size: DEFAULT_CELL_HEIGHT, findex: findexList[5] },
      };
    }
  },
  render(ctx, shape) {
    const info = getTableShapeInfo(shape);
    if (!info) return;

    const rect = getTableLocalBounds(shape);
    applyLocalSpace(ctx, rect, shape.rotation, () => {
      ctx.beginPath();
      ctx.rect(0, 0, rect.width, rect.height);
      applyFillStyle(ctx, shape.fill);
      ctx.fill();
      applyStrokeStyle(ctx, shape.stroke);
      ctx.stroke();

      ctx.beginPath();
      getInnerBorders(info, rect).forEach((seg) => {
        ctx.moveTo(seg[0].x, seg[0].y);
        ctx.lineTo(seg[1].x, seg[1].y);
      });
      ctx.stroke();
    });
  },
  getClipPath(shape) {
    const rectPolygon = getLocalRectPolygon(shape);
    const region = new Path2D();
    applyPath(region, rectPolygon, true);
    return region;
  },
  createSVGElementInfo(shape) {
    const info = getTableShapeInfo(shape);
    if (!info) return;

    const rect = getTableLocalBounds(shape);
    const affine = getRotatedRectAffine(rect, shape.rotation);

    const elems = getInnerBorders(info, rect).map((seg) => ({
      tag: "line",
      attributes: {
        x1: seg[0].x,
        y1: seg[0].y,
        x2: seg[1].x,
        y2: seg[1].y,
      },
    }));

    return {
      tag: "g",
      attributes: {
        transform: renderTransform(affine),
        ...renderStrokeSVGAttributes(shape.stroke),
      },
      children: [
        {
          tag: "rect",
          attributes: {
            width: rect.width,
            height: rect.height,
            ...renderFillSVGAttributes(shape.fill),
          },
        },
        ...elems,
      ],
    };
  },
  createClipSVGPath(shape) {
    const rectPolygon = getLocalRectPolygon(shape);
    const rawPath = createSVGCurvePath(rectPolygon, undefined, true);
    return pathSegmentRawsToString(rawPath);
  },
  getWrapperRect(shape, _, includeBounds) {
    let rect = getTableLocalBounds(shape);
    if (includeBounds) {
      rect = expandRect(rect, getStrokeWidth(shape.stroke) / 2);
    }
    return getRotatedWrapperRect(rect, shape.rotation);
  },
  getLocalRectPolygon,
  isPointOn(shape, p) {
    const rect = getTableLocalBounds(shape);
    return isPointOnRectangleRotated(rect, shape.rotation, p);
  },
  resize(shape, resizingAffine) {
    const srcRectPolygon = getLocalRectPolygon(shape);
    const srcWidth = getDistance(srcRectPolygon[0], srcRectPolygon[1]);
    const srcHeight = getDistance(srcRectPolygon[0], srcRectPolygon[3]);
    const srcP = shape.p;
    const srcRotation = shape.rotation;

    const nextPolygon = srcRectPolygon.map((p) => applyAffine(resizingAffine, p));
    const nextCenter = getCenter(nextPolygon[0], nextPolygon[2]);
    const nextWidth = getDistance(nextPolygon[0], nextPolygon[1]);
    const nextHeight = getDistance(nextPolygon[0], nextPolygon[3]);
    const nextP = { x: nextCenter.x - nextWidth / 2, y: nextCenter.y - nextHeight / 2 };
    const nextRotation = getRadian(nextPolygon[1], nextPolygon[0]);

    const ret: Partial<TableShape> = {};
    if (!isSame(nextP, srcP)) ret.p = nextP;
    if (!isSameValue(nextRotation, srcRotation)) ret.rotation = nextRotation;

    const info = getTableShapeInfo(shape);
    if (srcWidth > 0 && !isSameValue(nextWidth, srcWidth)) {
      const scale = nextWidth / srcWidth;
      info?.columns.forEach((val) => {
        ret[val.id] = { ...val, size: Math.max(0, val.size * scale) };
      });
    }
    if (srcHeight > 0 && !isSameValue(nextHeight, srcHeight)) {
      const scale = nextHeight / srcHeight;
      info?.rows.forEach((val) => {
        ret[val.id] = { ...val, size: Math.max(0, val.size * scale) };
      });
    }

    return ret;
  },
  applyScale(shape, scaleValue) {
    const info = getTableShapeInfo(shape);
    if (!info) return;

    const ret: Partial<TableShape> = {};
    info.columns.forEach((val) => {
      ret[val.id] = { ...val, size: Math.max(0, val.size * scaleValue.x) };
    });
    info.rows.forEach((val) => {
      ret[val.id] = { ...val, size: Math.max(0, val.size * scaleValue.y) };
    });
    return ret;
  },
  getClosestOutline(shape, p, threshold, thresholdForMarker = threshold) {
    const rect = getTableLocalBounds(shape);
    return getClosestOutlineForRect(rect, shape.rotation, p, threshold, thresholdForMarker);
  },
  getIntersectedOutlines(shape, from, to) {
    const polygon = getLocalRectPolygon(shape);
    return getIntersectedOutlinesOnPolygon(polygon, from, to);
  },
  getOutlinePaths(shape) {
    const rectPolygon = getLocalRectPolygon(shape);
    return [{ path: rectPolygon.concat([rectPolygon[0]]), curves: [] }];
  },
  getTangentAt(shape, p) {
    const edges = getSegments(getLocalRectPolygon(shape), true);
    const edgeInfo = getPolylineEdgeInfo(edges);

    const closestInfo = getClosestPointOnPolyline(edgeInfo, p, Infinity);
    if (!closestInfo) return shape.rotation;
    return getPointLerpSlope(edgeInfo.lerpFn, closestInfo[1]);
  },
  getCommonStyle,
  updateCommonStyle,
  canAttachSmartBranch: false,
  transparentSelection: true,
  unboundChildren: true,
};

export function isTableShape(shape: Shape): shape is TableShape {
  return shape.type === "table";
}

function getTableSize(shape: TableShape): Size {
  const info = getTableShapeInfo(shape);
  return getTableSizeByInfo(info);
}

export function getTableSizeByInfo(info?: TableShapeInfo): Size {
  const width = info?.columns.reduce((p, v) => p + v.size, 0) ?? 0;
  const height = info?.rows.reduce((p, v) => p + v.size, 0) ?? 0;
  return { width, height };
}

function getTableLocalBounds(shape: TableShape): IRectangle {
  const { width, height } = getTableSize(shape);
  return { x: shape.p.x, y: shape.p.y, width, height };
}

function getLocalRectPolygon(shape: TableShape) {
  const rect = getTableLocalBounds(shape);
  const c = getRectCenter(rect);
  const rotateFn = getRotateFn(shape.rotation, c);
  return getRectPoints(rect).map((p) => rotateFn(p));
}

/**
 * Returns "undefined" when tha table is invalid
 */
export function getTableShapeInfo(shape: Partial<TableShape>): TableShapeInfo | undefined {
  const columns: TableColumn[] = [];
  const rows: TableRow[] = [];
  const keys = Object.keys(shape) as (keyof TableShape)[];
  keys.forEach((key) => {
    if (!shape[key]) return;

    if (key.startsWith("c_")) {
      columns.push(shape[key] as TableColumn);
    } else if (key.startsWith("r_")) {
      rows.push(shape[key] as TableRow);
    }
  });
  if (columns.length * rows.length === 0) return;

  columns.sort(findexSortFn);
  rows.sort(findexSortFn);
  return { columns, rows };
}

export function getInnerBorders(tableInfo: TableShapeInfo, size: Size): ISegment[] {
  const ret: ISegment[] = [];
  {
    let x = 0;
    tableInfo.columns.forEach((column, i) => {
      if (i === tableInfo.columns.length - 1) return;

      x += column.size;
      ret.push([
        { x, y: 0 },
        { x, y: size.height },
      ]);
    });
  }
  {
    let y = 0;
    tableInfo.rows.forEach((row, i) => {
      if (i === tableInfo.rows.length - 1) return;

      y += row.size;
      ret.push([
        { x: 0, y },
        { x: size.width, y },
      ]);
    });
  }
  return ret;
}

/**
 * e.g. 3x3 table: rows: [0, 10, 20, 30], columns: [0, 10, 20, 30]
 */
export function getTableCoordsLocations(tableInfo?: TableShapeInfo): { rows: number[]; columns: number[] } {
  const columns: number[] = [0];
  {
    let x = 0;
    tableInfo?.columns.forEach((column) => {
      x += column.size;
      columns.push(x);
    });
  }
  const rows: number[] = [0];
  {
    let y = 0;
    tableInfo?.rows.forEach((row) => {
      y += row.size;
      rows.push(y);
    });
  }
  return { rows, columns };
}
