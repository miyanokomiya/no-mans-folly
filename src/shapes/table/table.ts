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
import { CommonStyle, FillStyle, Shape, Size, StrokeStyle } from "../../models";
import { findBackward, findexSortFn, toMap } from "../../utils/commons";
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
  isInMergeArea,
  isMergeAreaOverlapping,
  isPointOnRectangleRotated,
  isSameValue,
  MergeArea,
  optimiseMergeAreas,
} from "../../utils/geometry";
import { renderTransform, SVGElementInfo } from "../../utils/svgElements";
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
export type TableCoords = [rowId: TableRowKey, columnId: TableColumnKey];

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

export type TableCellArea = {
  a: TableCoords;
  b: TableCoords;
};

export type TableCellMergeKey = `m_${string}`;
export type TableCellMerge = { id: TableCellMergeKey } & TableCellArea;
export type TableCellMergeArea = { area: MergeArea; style?: TableCellStyleValue };

export type TableCellStyleKey = `s_${string}`;
export type TableCellStyleValue = {
  fill?: FillStyle;
};
export type TableCellStyle = {
  id: TableCellStyleKey;
} & TableCellStyleValue &
  TableCellArea;
export type TableStyleArea = [MergeArea[0], MergeArea[1], TableCellStyleValue];

export type TableShape = Shape &
  CommonStyle & {
    bodyStroke?: StrokeStyle; // When undefined, "stroke" should be used instead
  } & {
    [K in TableColumnKey]?: TableColumn;
  } & {
    [K in TableRowKey]?: TableRow;
  } & {
    [K in TableCellMergeKey]?: TableCellMerge;
  } & {
    [K in TableCellStyleKey]?: TableCellStyle;
  };

/**
 * Detailed table info derived from a table shape
 */
export type TableShapeInfo = {
  columns: TableColumn[];
  rows: TableRow[];
  merges: TableCellMerge[];
  mergeAreas: TableCellMergeArea[];
  resolvedMergeAreas: TableCellMergeArea[];
  styles: TableCellStyle[];
  styleAreas: TableStyleArea[];
};

export const struct: ShapeStruct<TableShape> = {
  label: "Table",
  create(arg = {}) {
    const info = getTableShapeInfoRaw(arg);
    const ret = {
      ...createBaseShape(arg),
      type: "table",
      fill: arg.fill ?? createFillStyle({ disabled: true }),
      stroke: arg.stroke ?? createStrokeStyle(),
      bodyStroke: arg.bodyStroke,
    };

    if (info.rows.length * info.columns.length > 0) {
      return { ...ret, ...toMap(info.columns), ...toMap(info.rows), ...toMap(info.merges), ...toMap(info.styles) };
    } else {
      const findexList = generateNKeysBetweenAllowSame(undefined, undefined, 6);
      return {
        ...ret,
        ...toMap(info.merges),
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
    const coordsLocations = getTableCoordsLocations(info);
    applyLocalSpace(ctx, rect, shape.rotation, () => {
      if (!shape.fill.disabled) {
        ctx.beginPath();
        ctx.rect(0, 0, rect.width, rect.height);
        applyFillStyle(ctx, shape.fill);
        ctx.fill();
      }

      const styleAreaInfoList = info.styleAreas.map((styleArea) => {
        return getStyleAreaInfo(info, coordsLocations, styleArea);
      });

      // 1. Set clip by "resolvedMergeAreas" & disabled "styleAreas"
      // 2. Render "styleAreas"
      // 3. Finish clip
      // 4. Render "resolvedMergeAreas"
      const region = new Path2D();
      const clipFns: (() => void)[] = [];
      info.resolvedMergeAreas.forEach((rma) => {
        const areaRect = getAreaRect(coordsLocations, rma.area);
        clipFns.push(() => region.rect(areaRect.x, areaRect.y, areaRect.width, areaRect.height));
      });
      styleAreaInfoList.forEach((styleAreaInfo) => {
        if (styleAreaInfo.value.fill?.disabled) {
          clipFns.push(() =>
            styleAreaInfo.rects.forEach((styleRect) =>
              region.rect(styleRect.x, styleRect.y, styleRect.width, styleRect.height),
            ),
          );
        }
      });

      const beginClip = (renderFn: () => void) => {
        if (clipFns.length > 0) {
          region.rect(0, 0, rect.width, rect.height);
          clipFns.forEach((fn) => fn());
          ctx.save();
          ctx.clip(region, "evenodd");
        }
        renderFn();
        if (clipFns.length > 0) {
          ctx.restore();
        }
      };

      beginClip(() => {
        styleAreaInfoList.forEach((styleAreaInfo) => {
          if (styleAreaInfo.value.fill && !styleAreaInfo.value.fill.disabled) {
            applyFillStyle(ctx, styleAreaInfo.value.fill);
            ctx.beginPath();
            styleAreaInfo.rects.forEach((styleRect) =>
              ctx.rect(styleRect.x, styleRect.y, styleRect.width, styleRect.height),
            );
            ctx.fill();
          }
        });
      });

      info.resolvedMergeAreas.forEach((rma) => {
        if (!rma.style?.fill || rma.style?.fill?.disabled) return;

        const areaRect = getAreaRect(coordsLocations, rma.area);
        applyFillStyle(ctx, rma.style.fill);
        ctx.beginPath();
        ctx.rect(areaRect.x, areaRect.y, areaRect.width, areaRect.height);
        ctx.fill();
      });

      const bodyStroke = shape.bodyStroke ?? shape.stroke;
      if (!bodyStroke.disabled) {
        ctx.beginPath();
        getInnerBordersWithMerge(info, rect).forEach((seg) => {
          ctx.moveTo(seg[0].x, seg[0].y);
          ctx.lineTo(seg[1].x, seg[1].y);
        });
        applyStrokeStyle(ctx, bodyStroke);
        ctx.stroke();
      }

      if (!shape.stroke.disabled) {
        ctx.beginPath();
        ctx.rect(0, 0, rect.width, rect.height);
        applyStrokeStyle(ctx, shape.stroke);
        ctx.stroke();
      }
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

    const coordsLocations = getTableCoordsLocations(info);
    const rect = getTableLocalBounds(shape);
    const affine = getRotatedRectAffine(rect, shape.rotation);

    const styleAreaInfoList = info.styleAreas.map((styleArea) => {
      return getStyleAreaInfo(info, coordsLocations, styleArea);
    });

    // 1. Set clip by "resolvedMergeAreas" & disabled "styleAreas"
    // 2. Render "styleAreas"
    // 3. Finish clip
    // 4. Render "resolvedMergeAreas"
    const clipId = `clip-${shape.id}`;
    const clipPathCommandList: string[] = [];

    info.resolvedMergeAreas.forEach((rma) => {
      const areaRect = getAreaRect(coordsLocations, rma.area);
      const pathStr = pathSegmentRawsToString(createSVGCurvePath(getRectPoints(areaRect)));
      clipPathCommandList.push(pathStr);
    });
    styleAreaInfoList.forEach((styleAreaInfo) => {
      if (styleAreaInfo.value.fill?.disabled) {
        styleAreaInfo.rects.forEach((areaRect) => {
          const pathStr = pathSegmentRawsToString(createSVGCurvePath(getRectPoints(areaRect)));
          clipPathCommandList.push(pathStr);
        });
      }
    });

    const fillElms: SVGElementInfo[] = [];
    styleAreaInfoList.forEach((styleAreaInfo) => {
      const fillStyle = styleAreaInfo.value.fill;
      if (fillStyle && !fillStyle.disabled) {
        styleAreaInfo.rects.forEach((areaRect) => {
          fillElms.push({
            tag: "rect",
            attributes: {
              x: areaRect.x,
              y: areaRect.y,
              width: areaRect.width,
              height: areaRect.height,
              ...renderFillSVGAttributes(fillStyle),
            },
          });
        });
      }
    });

    const mergeFillElms: SVGElementInfo[] = [];
    info.resolvedMergeAreas.forEach((rma) => {
      if (!rma.style?.fill || rma.style?.fill?.disabled) return;

      const areaRect = getAreaRect(coordsLocations, rma.area);
      mergeFillElms.push({
        tag: "rect",
        attributes: {
          x: areaRect.x,
          y: areaRect.y,
          width: areaRect.width,
          height: areaRect.height,
          ...renderFillSVGAttributes(rma.style.fill),
        },
      });
    });

    const bodyStroke = shape.bodyStroke ?? shape.stroke;
    const borderElms: SVGElementInfo[] = getInnerBordersWithMerge(info, rect).map((seg) => ({
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
      attributes: { transform: renderTransform(affine) },
      children: [
        ...(clipPathCommandList.length > 0
          ? [
              {
                tag: "clipPath",
                attributes: { id: clipId, stroke: "none" },
                children: [
                  {
                    tag: "path",
                    attributes: {
                      "clip-rule": "evenodd",
                      d:
                        pathSegmentRawsToString(
                          createSVGCurvePath(getRectPoints({ x: 0, y: 0, width: rect.width, height: rect.height })),
                        ) +
                        " " +
                        clipPathCommandList.join(" "),
                    },
                  },
                ],
              },
            ]
          : []),
        {
          tag: "rect",
          attributes: {
            width: rect.width,
            height: rect.height,
            stroke: "none",
            ...renderFillSVGAttributes(shape.fill),
          },
        },
        {
          tag: "g",
          attributes: { "clip-path": clipPathCommandList.length > 0 ? `url(#${clipId})` : undefined },
          children: fillElms,
        },
        ...mergeFillElms,
        {
          tag: "g",
          attributes: renderStrokeSVGAttributes(bodyStroke),
          children: borderElms,
        },
        {
          tag: "rect",
          attributes: {
            width: rect.width,
            height: rect.height,
            fill: "none",
            ...renderStrokeSVGAttributes(shape.stroke),
          },
        },
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

const tableInfoCache = new WeakMap<Partial<TableShape>, TableShapeInfo>();

/**
 * Returns "undefined" when tha table is invalid
 * Returned value contains:
 * - rows and columns in order
 * - merges with normalized range
 */
export function getTableShapeInfo(shape: Partial<TableShape>): TableShapeInfo | undefined {
  const cached = tableInfoCache.get(shape);
  if (cached) return cached;

  const rawInfo = getTableShapeInfoRaw(shape);
  if (rawInfo.columns.length * rawInfo.rows.length === 0) return;

  tableInfoCache.set(shape, rawInfo);
  return rawInfo;
}

function getTableShapeInfoRaw(shape: Partial<TableShape>): TableShapeInfo {
  const columns: TableColumn[] = [];
  const rows: TableRow[] = [];
  const merges: TableCellMerge[] = [];
  const mergeAreas: TableCellMergeArea[] = [];
  const styles: TableCellStyle[] = [];
  const styleAreas: TableStyleArea[] = [];
  const keys = Object.keys(shape) as (keyof TableShape)[];
  keys.forEach((key) => {
    if (!shape[key]) return;

    if (key.startsWith("c_")) {
      columns.push(shape[key] as TableColumn);
    } else if (key.startsWith("r_")) {
      rows.push(shape[key] as TableRow);
    } else if (key.startsWith("m_")) {
      merges.push(shape[key] as TableCellMerge);
    } else if (key.startsWith("s_")) {
      styles.push(shape[key] as TableCellStyle);
    }
  });

  columns.sort(findexSortFn);
  rows.sort(findexSortFn);

  const tableInfoRaw = { columns, rows, merges, styles };
  const rowIndexById = new Map(tableInfoRaw.rows.map((r, i) => [r.id, i]));
  const columnIndexById = new Map(tableInfoRaw.columns.map((c, i) => [c.id, i]));

  const adjustedMerged: TableCellMerge[] = [];
  tableInfoRaw.merges.forEach((m) => {
    const ra = rowIndexById.get(m.a[0]);
    const rb = rowIndexById.get(m.b[0]);
    const ca = columnIndexById.get(m.a[1]);
    const cb = columnIndexById.get(m.b[1]);
    if (ra === undefined || rb === undefined || ca === undefined || cb === undefined) return;

    const [r0, r1] = ra <= rb ? [m.a[0], m.b[0]] : [m.b[0], m.a[0]];
    const [c0, c1] = ca <= cb ? [m.a[1], m.b[1]] : [m.b[1], m.a[1]];
    adjustedMerged.push({ id: m.id, a: [r0, c0], b: [r1, c1] });
    const [ri0, ri1] = ra <= rb ? [ra, rb] : [rb, ra];
    const [ci0, ci1] = ca <= cb ? [ca, cb] : [cb, ca];
    mergeAreas.push({
      area: [
        [ri0, ci0],
        [ri1, ci1],
      ],
    });
  });

  const adjustedStyles: TableCellStyle[] = [];
  tableInfoRaw.styles.forEach((s) => {
    const ra = rowIndexById.get(s.a[0]);
    const rb = rowIndexById.get(s.b[0]);
    const ca = columnIndexById.get(s.a[1]);
    const cb = columnIndexById.get(s.b[1]);
    if (ra === undefined || rb === undefined || ca === undefined || cb === undefined) return;

    const [r0, r1] = ra <= rb ? [s.a[0], s.b[0]] : [s.b[0], s.a[0]];
    const [c0, c1] = ca <= cb ? [s.a[1], s.b[1]] : [s.b[1], s.a[1]];
    adjustedStyles.push({ id: s.id, a: [r0, c0], b: [r1, c1] });
    const [ri0, ri1] = ra <= rb ? [ra, rb] : [rb, ra];
    const [ci0, ci1] = ca <= cb ? [ca, cb] : [cb, ca];
    styleAreas.push([[ri0, ci0], [ri1, ci1], getTableCellStyleValue(s)]);
  });

  const ret: TableShapeInfo = {
    columns,
    rows,
    merges: adjustedMerged,
    mergeAreas,
    resolvedMergeAreas: [],
    styles,
    styleAreas,
  };

  const checkedMergeSet = new Set<TableCellMerge>();
  ret.merges.forEach((m) => {
    checkedMergeSet.add(m);
    const info = getCoordsBoundsInfo(ret, [m.a]);
    if (!info) return;

    // Prioritize newer style
    const style = findBackward(ret.styleAreas, (s) =>
      isInMergeArea([s[0], s[1]], [info.mergeArea[0], info.mergeArea[0]], true),
    );
    ret.resolvedMergeAreas.push({ area: info.mergeArea, style: style?.[2] });
  });

  return ret;
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

export function getInnerBordersWithMerge(tableInfo: TableShapeInfo, size: Size): ISegment[] {
  if (tableInfo.mergeAreas.length === 0) return getInnerBorders(tableInfo, size);

  const coordsLocations = getTableCoordsLocations(tableInfo);
  const mergeAreasByFromRow: Record<string, MergeArea[]> = {};
  const mergeAreasByFromColumn: Record<string, MergeArea[]> = {};

  tableInfo.mergeAreas.forEach((m) => {
    for (let i = m.area[0][0]; i < m.area[1][0]; i++) {
      mergeAreasByFromRow[i] ??= [];
      mergeAreasByFromRow[i].push(m.area);
    }
  });
  tableInfo.mergeAreas.forEach((m) => {
    for (let i = m.area[0][1]; i < m.area[1][1]; i++) {
      mergeAreasByFromColumn[i] ??= [];
      mergeAreasByFromColumn[i].push(m.area);
    }
  });

  const ret: ISegment[] = [];
  {
    let x = 0;
    tableInfo.columns.forEach((column, i) => {
      if (i === tableInfo.columns.length - 1) return;

      const mergeAreas = mergeAreasByFromColumn[i]?.toSorted((a, b) => a[0][0] - b[0][0]) ?? [];
      const ranges: [number, number][] = [];
      let range: [number, number] = [0, tableInfo.rows.length];
      mergeAreas.forEach((m) => {
        if (m[0][1] < m[1][1] && range[0] <= m[0][0]) {
          if (m[0][0] > 0) ranges.push([range[0], m[0][0]]);
          range = [m[1][0] + 1, range[1]];
        }
      });
      if (range[0] < range[1]) ranges.push(range);

      x += column.size;
      ranges.forEach((range) =>
        ret.push([
          { x, y: coordsLocations.rows[range[0]] },
          { x, y: coordsLocations.rows[range[1]] },
        ]),
      );
    });
  }
  {
    let y = 0;
    tableInfo.rows.forEach((row, i) => {
      if (i === tableInfo.rows.length - 1) return;

      const mergeAreas = mergeAreasByFromRow[i]?.toSorted((a, b) => a[0][1] - b[0][1]) ?? [];
      const ranges: [number, number][] = [];
      let range: [number, number] = [0, tableInfo.columns.length];
      mergeAreas.forEach((m) => {
        if (m[0][0] < m[1][0] && range[0] <= m[0][1]) {
          if (m[0][1] > 0) ranges.push([range[0], m[0][1]]);
          range = [m[1][1] + 1, range[1]];
        }
      });
      if (range[0] < range[1]) ranges.push(range);

      y += row.size;
      ranges.forEach((range) =>
        ret.push([
          { x: coordsLocations.columns[range[0]], y },
          { x: coordsLocations.columns[range[1]], y },
        ]),
      );
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

export function generateTable(
  row: number,
  column: number,
  cellSize: Size = { width: DEFAULT_CELL_WIDTH, height: DEFAULT_CELL_HEIGHT },
) {
  const rowFindexList = generateNKeysBetweenAllowSame(undefined, undefined, row);
  const columnFindexList = generateNKeysBetweenAllowSame(undefined, undefined, column);
  return struct.create({
    id: "table",
    ...toMap(rowFindexList.map((findex, i) => ({ id: `r_${i}`, findex, size: cellSize.height }))),
    ...toMap(columnFindexList.map((findex, i) => ({ id: `c_${i}`, findex, size: cellSize.width }))),
  });
}

export function parseTableMeta(meta?: string): TableCoords | undefined {
  if (!meta) return;

  const result = meta.split(/\s*:\s*/);
  return result.length === 2 ? (result as TableCoords) : undefined;
}

export function formatMerges(tableInfo: TableShapeInfo): MergeArea[] {
  const rowIndexById = new Map(tableInfo.rows.map((r, i) => [r.id, i]));
  const columnIndexById = new Map(tableInfo.columns.map((c, i) => [c.id, i]));
  // MergeArea: [from: [row, column], to: [row, column]]
  const mergedRangeById = new Map<string, MergeArea>();
  tableInfo.merges.forEach((m) => {
    const ra = rowIndexById.get(m.a[0]);
    const rb = rowIndexById.get(m.b[0]);
    const ca = columnIndexById.get(m.a[1]);
    const cb = columnIndexById.get(m.b[1]);
    if (ra === undefined || rb === undefined || ca === undefined || cb === undefined) return;

    mergedRangeById.set(m.id, [
      [ra, ca],
      [rb, cb],
    ]);
  });

  const optimised = optimiseMergeAreas(Array.from(mergedRangeById.values()), true);
  return optimised;
}

function getAreaRect(coordsLocations: { rows: number[]; columns: number[] }, m: MergeArea): IRectangle {
  const t = coordsLocations.rows[m[0][0]];
  const b = coordsLocations.rows[m[1][0] + 1];
  const l = coordsLocations.columns[m[0][1]];
  const r = coordsLocations.columns[m[1][1] + 1];
  return { x: l, y: t, width: r - l, height: b - t };
}

export function getStyleAreaInfo(
  info: TableShapeInfo,
  coordsLocations: { rows: number[]; columns: number[] },
  styleArea: TableStyleArea,
): { rects: IRectangle[]; value: TableCellStyleValue } {
  const styleAreaVal: MergeArea = [styleArea[0], styleArea[1]];
  const rects: IRectangle[] = [getAreaRect(coordsLocations, styleAreaVal)];
  info.mergeAreas.find((m) => {
    if (isMergeAreaOverlapping([m.area[0], m.area[0]], styleAreaVal, true)) {
      rects.push(getAreaRect(coordsLocations, m.area));
    }
  });
  return { rects, value: styleArea[2] };
}

function getCoordsBoundsRawInfo(
  tableInfo: TableShapeInfo,
  coordsList: TableCoords[],
):
  | {
      bounds: [from: [TableRowKey, TableColumnKey], to: [TableRowKey, TableColumnKey]];
      mergeArea: MergeArea;
      rowIndexById: Map<TableRowKey, number>;
      columnIndexById: Map<TableColumnKey, number>;
    }
  | undefined {
  const rowIndexById = new Map(tableInfo.rows.map((r, i) => [r.id, i]));
  const columnIndexById = new Map(tableInfo.columns.map((c, i) => [c.id, i]));
  let r0: [index: number, TableRowKey] | undefined;
  let r1: [index: number, TableRowKey] | undefined;
  let c0: [index: number, TableColumnKey] | undefined;
  let c1: [index: number, TableColumnKey] | undefined;
  coordsList.forEach(([rowId, columnId]) => {
    const rowIndex = rowIndexById.get(rowId);
    const columnIndex = columnIndexById.get(columnId);
    if (rowIndex === undefined || columnIndex === undefined) return;

    r0 = r0 === undefined || rowIndex < r0[0] ? [rowIndex, rowId] : r0;
    r1 = r1 === undefined || r1[0] < rowIndex ? [rowIndex, rowId] : r1;
    c0 = c0 === undefined || columnIndex < c0[0] ? [columnIndex, columnId] : c0;
    c1 = c1 === undefined || c1[0] < columnIndex ? [columnIndex, columnId] : c1;
  });
  if (!r0 || !r1 || !c0 || !c1) return;

  return {
    bounds: [
      [r0[1], c0[1]],
      [r1[1], c1[1]],
    ],
    mergeArea: [
      [r0[0], c0[0]],
      [r1[0], c1[0]],
    ],
    rowIndexById,
    columnIndexById,
  };
}

/**
 * Returned "bounds" covers all coords with merge areas regarded
 * Returned "touchIds" represent all cell merges overlapped by "bounds"
 */
export function getCoordsBoundsInfo(
  tableInfo: TableShapeInfo,
  coordsList: TableCoords[],
):
  | {
      bounds: [from: [TableRowKey, TableColumnKey], to: [TableRowKey, TableColumnKey]];
      mergeArea: MergeArea;
      touchIds: TableCellMergeKey[];
    }
  | undefined {
  const boundsRawInfo = getCoordsBoundsRawInfo(tableInfo, coordsList);
  if (!boundsRawInfo) return;

  const { bounds, mergeArea, rowIndexById, columnIndexById } = boundsRawInfo;
  const touchIds: Set<TableCellMergeKey> = new Set();
  tableInfo.merges.forEach((m) => {
    const ra = rowIndexById.get(m.a[0]);
    const rb = rowIndexById.get(m.b[0]);
    const ca = columnIndexById.get(m.a[1]);
    const cb = columnIndexById.get(m.b[1]);
    if (ra === undefined || rb === undefined || ca === undefined || cb === undefined) return;

    const area: MergeArea = [
      [ra, ca],
      [rb, cb],
    ];
    if (isMergeAreaOverlapping(mergeArea, area, true)) {
      touchIds.add(m.id);
    }
  });

  const touchList = tableInfo.merges.filter((m) => touchIds.has(m.id));
  let r0: [index: number, TableRowKey] = [mergeArea[0][0], bounds[0][0]];
  let r1: [index: number, TableRowKey] = [mergeArea[1][0], bounds[1][0]];
  let c0: [index: number, TableColumnKey] = [mergeArea[0][1], bounds[0][1]];
  let c1: [index: number, TableColumnKey] = [mergeArea[1][1], bounds[1][1]];
  touchList.forEach((m) => {
    const aRowIndex = rowIndexById.get(m.a[0]);
    const aColumnIndex = columnIndexById.get(m.a[1]);
    const bRowIndex = rowIndexById.get(m.b[0]);
    const bColumnIndex = columnIndexById.get(m.b[1]);
    if (aRowIndex === undefined || aColumnIndex === undefined || bRowIndex === undefined || bColumnIndex === undefined)
      return;

    r0 = aRowIndex < r0[0] ? [aRowIndex, m.a[0]] : r0;
    r1 = r1[0] < bRowIndex ? [bRowIndex, m.b[0]] : r1;
    c0 = aColumnIndex < c0[0] ? [aColumnIndex, m.a[1]] : c0;
    c1 = c1[0] < bColumnIndex ? [bColumnIndex, m.b[1]] : c1;
  });

  return {
    bounds: [
      [r0[1], c0[1]],
      [r1[1], c1[1]],
    ],
    mergeArea: [
      [r0[0], c0[0]],
      [r1[0], c1[0]],
    ],
    touchIds: Array.from(touchIds),
  };
}

export function getTableCellStyleValue(val: TableCellStyle | TableCellStyleValue): TableCellStyleValue {
  return { fill: val.fill };
}

export function getIndexStyleValueAt(tableInfo: TableShapeInfo, coords: TableCoords): TableCellStyleValue {
  const rIndex = tableInfo.rows.findIndex((r) => r.id === coords[0]);
  const cIndex = tableInfo.columns.findIndex((c) => c.id === coords[1]);
  if (rIndex < 0 || cIndex < 0) return {};

  const coordsArea: MergeArea = [
    [rIndex, cIndex],
    [rIndex, cIndex],
  ];
  return (
    findBackward(tableInfo?.styleAreas ?? [], (sa) => {
      return isInMergeArea([sa[0], sa[1]], coordsArea, true);
    })?.[2] ?? {}
  );
}
