import {
  add,
  AffineMatrix,
  applyAffine,
  getDistance,
  getOuterRectangle,
  getRectCenter,
  IRectangle,
  isSame,
  isZero,
  IVec2,
  multiAffines,
  rotate,
  sub,
} from "okageo";
import { EntityPatchInfo, Shape, StyleScheme } from "../../models";
import {
  getCellStyleType,
  getCoordsBoundsInfo,
  getTableCoordsLocations,
  getTableShapeInfo,
  getTableSizeByInfo,
  isTableShape,
  parseTableMeta,
  TableCellArea,
  TableCellMerge,
  TableCellStyle,
  TableCellStyleKey,
  TableCellStyleValue,
  TableColumn,
  TableColumnKey,
  TableCoords,
  TableRow,
  TableRowKey,
  TableShape,
  TableShapeInfo,
} from "../../shapes/table/table";
import {
  CellInfo,
  getDistanceBetweenPointAndRect,
  getRectPoints,
  getRotatedAtAffine,
  getRotateFn,
  getRotationAffines,
  groupCellsIntoRectangles,
  ISegment,
  isInMergeArea,
  isPointCloseToSegment,
  isPointOnRectangle,
  MergeArea,
  TAU,
} from "../../utils/geometry";
import { ShapeComposite } from "../shapeComposite";
import { tableLayout, TableLayoutBox, TableLayoutNode } from "../../utils/layouts/table";
import { CanvasCTX } from "../../utils/types";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { LayoutNodeWithMeta } from "./layoutHandler";
import { defineShapeHandler } from "./core";
import { applyLocalSpace, applyPath, renderPlusIcon, scaleGlobalAlpha } from "../../utils/renderer";
import { generateNKeysBetweenAllowSame } from "../../utils/findex";
import { applyFillStyle } from "../../utils/fillStyle";
import { COLORS } from "../../utils/color";
import { LayoutFn } from "../../utils/layouts/core";
import { isObjectEmpty, mapEach, splitList, toMap } from "../../utils/commons";

const BORDER_THRESHOLD = 8;
const ANCHOR_SIZE = 10;
const HEAD_ANCHOR_MARGIN = 30;
const ADD_ANCHOR_MARGIN = HEAD_ANCHOR_MARGIN + ANCHOR_SIZE;
const CELL_ANCHOR_SIZE = 20;

// "coord" is from 0 to the number of lines. 0 refers to the head line.
type BorderAnchor = { type: "border-row" | "border-column"; coord: number; segment: ISegment; opposite?: boolean };
type AddLineAnchor = { type: "add-row" | "add-column"; coord: number; p: IVec2 };
type LineHeadAnchor = { type: "head-row" | "head-column"; coord: number; rect: IRectangle };
type CellAnchor = {
  type: "area-cell";
  coords: [number, number];
  rect: IRectangle;
  markerRect: IRectangle;
};
type CellMarkerAnchor = {
  type: "marker-cell";
  coords: [number, number];
  rect: IRectangle;
};

export type TableHitResult = BorderAnchor | AddLineAnchor | LineHeadAnchor | CellAnchor | CellMarkerAnchor;

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newTableHandler = defineShapeHandler<TableHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as TableShape;
  const tableInfo = getTableShapeInfo(shape);
  const size = getTableSizeByInfo(tableInfo);
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: size.width, height: size.height };
  const rotateFn = getRotateFn(shape.rotation, getRectCenter(shapeRect));
  const coordsLocations = getTableCoordsLocations(tableInfo);

  function getBorderAnchors(scale: number): BorderAnchor[] {
    const ret: BorderAnchor[] = [];
    const extra = HEAD_ANCHOR_MARGIN * scale;
    const borderThreshold = BORDER_THRESHOLD * scale;
    coordsLocations.rows.forEach((y, r) => {
      if (r === 0) {
        ret.push({
          type: "border-row",
          coord: r,
          segment: [
            { x: -extra, y: y + borderThreshold / 2 },
            { x: 0, y: y + borderThreshold / 2 },
          ],
          opposite: true,
        });
      } else if (r === coordsLocations.rows.length - 1) {
        ret.push({
          type: "border-row",
          coord: r,
          segment: [
            { x: -extra, y: y - borderThreshold / 2 },
            { x: 0, y: y - borderThreshold / 2 },
          ],
        });
      } else {
        ret.push({
          type: "border-row",
          coord: r,
          segment: [
            { x: -extra, y: y - borderThreshold },
            { x: 0, y: y - borderThreshold },
          ],
        });
        ret.push({
          type: "border-row",
          coord: r + 1,
          segment: [
            { x: -extra, y: y + borderThreshold },
            { x: 0, y: y + borderThreshold },
          ],
          opposite: true,
        });
      }
    });
    coordsLocations.columns.forEach((x, c) => {
      if (c === 0) {
        ret.push({
          type: "border-column",
          coord: c,
          segment: [
            { x: x + borderThreshold / 2, y: -extra },
            { x: x + borderThreshold / 2, y: 0 },
          ],
          opposite: true,
        });
      } else if (c === coordsLocations.columns.length - 1) {
        ret.push({
          type: "border-column",
          coord: c,
          segment: [
            { x: x - borderThreshold / 2, y: -extra },
            { x: x - borderThreshold / 2, y: 0 },
          ],
        });
      } else {
        ret.push({
          type: "border-column",
          coord: c,
          segment: [
            { x: x - borderThreshold, y: -extra },
            { x: x - borderThreshold, y: 0 },
          ],
        });
        ret.push({
          type: "border-column",
          coord: c + 1,
          segment: [
            { x: x + borderThreshold, y: -extra },
            { x: x + borderThreshold, y: 0 },
          ],
          opposite: true,
        });
      }
    });
    return ret;
  }

  function getAddLineAnchors(scale: number): AddLineAnchor[] {
    const ret: AddLineAnchor[] = [];
    const extra = ADD_ANCHOR_MARGIN * scale;
    coordsLocations.rows.forEach((y, r) => {
      ret.push({
        type: "add-row",
        coord: r,
        p: { x: -extra, y },
      });
    });
    coordsLocations.columns.forEach((x, c) => {
      ret.push({
        type: "add-column",
        coord: c,
        p: { x, y: -extra },
      });
    });
    return ret;
  }

  function getHeadAnchors(scale: number): LineHeadAnchor[] {
    const ret: LineHeadAnchor[] = [];
    const extra = HEAD_ANCHOR_MARGIN * scale;
    const margin = 5 * scale;
    coordsLocations.rows.forEach((y, r) => {
      if (r >= coordsLocations.rows.length - 1) return;

      ret.push({
        type: "head-row",
        coord: r,
        rect: { x: -extra, y, width: extra - margin, height: coordsLocations.rows[r + 1] - coordsLocations.rows[r] },
      });
    });
    coordsLocations.columns.forEach((x, c) => {
      ret.push({
        type: "head-column",
        coord: c,
        rect: {
          x,
          y: -extra,
          width: coordsLocations.columns[c + 1] - coordsLocations.columns[c],
          height: extra - margin,
        },
      });
    });
    return ret;
  }

  function getEffectiveCellInfoAt(
    row: number,
    column: number,
  ): { coords: [number, number]; rect: IRectangle } | undefined {
    if (!tableInfo) return;

    const coordsBoundsInfo = getCoordsBoundsInfo(tableInfo, [[tableInfo.rows[row].id, tableInfo.columns[column].id]]);
    if (!coordsBoundsInfo) return;

    const adjustedRowFrom = tableInfo.rows.findIndex((r) => r.id === coordsBoundsInfo.bounds[0][0]);
    const adjustedColumnFrom = tableInfo.columns.findIndex((c) => c.id === coordsBoundsInfo.bounds[0][1]);
    const adjustedRowTo = tableInfo.rows.findIndex((r) => r.id === coordsBoundsInfo.bounds[1][0]);
    const adjustedColumnTo = tableInfo.columns.findIndex((c) => c.id === coordsBoundsInfo.bounds[1][1]);

    const left = coordsLocations.columns[adjustedColumnFrom];
    const right = coordsLocations.columns[adjustedColumnTo + 1];
    const top = coordsLocations.rows[adjustedRowFrom];
    const bottom = coordsLocations.rows[adjustedRowTo + 1];
    return {
      coords: [adjustedRowFrom, adjustedColumnFrom],
      rect: { x: left, y: top, width: right - left, height: bottom - top },
    };
  }

  function hitTestCellAnchorMarker(adjustedP: IVec2, scale: number): CellMarkerAnchor | undefined {
    if (!tableInfo || adjustedP.x < 0 || adjustedP.y < 0) return;

    const markerSize = CELL_ANCHOR_SIZE * scale;
    const row = coordsLocations.rows.findIndex((y) => y <= adjustedP.y && adjustedP.y < y + markerSize);
    const column = coordsLocations.columns.findIndex((x) => x <= adjustedP.x && adjustedP.x < x + markerSize);
    if (row < 0 || column < 0) return;
    if (row === coordsLocations.rows.length - 1 || column === coordsLocations.columns.length - 1) return;

    const info = getEffectiveCellInfoAt(row, column);
    if (!info) return;

    const markerRect = { x: info.rect.x, y: info.rect.y, width: markerSize, height: markerSize };
    if (!isPointOnRectangle(markerRect, adjustedP)) return;

    return {
      type: "marker-cell",
      coords: info.coords,
      rect: { x: info.rect.x, y: info.rect.y, width: markerSize, height: markerSize },
    };
  }

  function hitTestCellAnchor(adjustedP: IVec2, scale: number): CellAnchor | undefined {
    if (!tableInfo || adjustedP.x < 0 || adjustedP.y < 0) return;

    const row = coordsLocations.rows.findIndex((y, i) => i > 0 && adjustedP.y < y) - 1;
    const column = coordsLocations.columns.findIndex((x, i) => i > 0 && adjustedP.x < x) - 1;
    if (row < 0 || column < 0) return;

    const info = getEffectiveCellInfoAt(row, column);
    if (!info) return;

    const markerSize = CELL_ANCHOR_SIZE * scale;
    return {
      type: "area-cell",
      coords: info.coords,
      rect: info.rect,
      markerRect: { x: info.rect.x, y: info.rect.y, width: markerSize, height: markerSize },
    };
  }

  function hitTest(p: IVec2, scale = 1): TableHitResult | undefined {
    const adjustedP = sub(rotateFn(p, true), shape.p);
    const borderThreshold = BORDER_THRESHOLD * scale;
    const anchorSize = ANCHOR_SIZE * scale;

    const addLineAnchor = getAddLineAnchors(scale).find((a) => {
      return getDistance(a.p, adjustedP) <= anchorSize;
    });
    if (addLineAnchor) return addLineAnchor;

    const borderAnchor = getBorderAnchors(scale).find((a) => {
      return isPointCloseToSegment(a.segment, adjustedP, borderThreshold);
    });
    if (borderAnchor) return borderAnchor;

    const headAnchor = getHeadAnchors(scale).find((a) => {
      return isPointOnRectangle(a.rect, adjustedP);
    });
    if (headAnchor) return headAnchor;

    const cellAnchorMarker = hitTestCellAnchorMarker(adjustedP, scale);
    if (cellAnchorMarker) return cellAnchorMarker;

    const cellAnchor = hitTestCellAnchor(adjustedP, scale);
    if (cellAnchor) return cellAnchor;
  }

  function render(ctx: CanvasCTX, style: StyleScheme, scale: number, hitResult?: TableHitResult) {
    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      const anchorSize = ANCHOR_SIZE * scale;

      const headerAnchors = getHeadAnchors(scale);
      scaleGlobalAlpha(ctx, 0.3, () => {
        applyFillStyle(ctx, { color: style.selectionPrimary });
        ctx.beginPath();
        headerAnchors.forEach((a) => {
          ctx.rect(a.rect.x, a.rect.y, a.rect.width, a.rect.height);
        });
        ctx.fill();
      });
      if (hitResult?.type === "head-row" || hitResult?.type === "head-column") {
        applyFillStyle(ctx, { color: style.selectionSecondaly });
        ctx.beginPath();
        ctx.rect(hitResult.rect.x, hitResult.rect.y, hitResult.rect.width, hitResult.rect.height);
        ctx.fill();
      }

      const borderAnchorSize = 2 * BORDER_THRESHOLD * scale;
      const borderAnchors = getBorderAnchors(scale);
      const [fitBorderAnchors, nofitBorderAnchors] = splitList(borderAnchors, (a) => {
        const lineCoord = Math.max(0, a.coord - 1);
        const lines = a.type === "border-row" ? tableInfo?.rows : tableInfo?.columns;
        return !!lines?.[lineCoord]?.fit;
      });

      applyStrokeStyle(ctx, { color: style.selectionPrimary, width: borderAnchorSize });
      scaleGlobalAlpha(ctx, 0.5, () => {
        ctx.beginPath();
        fitBorderAnchors.forEach((a) => {
          ctx.moveTo(a.segment[0].x, a.segment[0].y);
          ctx.lineTo(a.segment[1].x, a.segment[1].y);
        });
        ctx.stroke();
      });

      ctx.beginPath();
      nofitBorderAnchors.forEach((a) => {
        ctx.moveTo(a.segment[0].x, a.segment[0].y);
        ctx.lineTo(a.segment[1].x, a.segment[1].y);
      });
      ctx.stroke();

      // Separators between adjacent border anchors
      const addLineAnchorsExtra = HEAD_ANCHOR_MARGIN * scale;
      const addLineAnchors = getAddLineAnchors(scale);
      applyStrokeStyle(ctx, { color: COLORS.BLACK, width: 2 * scale });
      ctx.beginPath();
      coordsLocations.columns.forEach((column, i) => {
        if (i === 0 || i === coordsLocations.columns.length - 1) return;
        ctx.moveTo(column, 0);
        ctx.lineTo(column, -addLineAnchorsExtra);
      });
      coordsLocations.rows.forEach((row, i) => {
        if (i === 0 || i === coordsLocations.rows.length - 1) return;
        ctx.moveTo(0, row);
        ctx.lineTo(-addLineAnchorsExtra, row);
      });
      ctx.stroke();

      const lineHighlightSize = 6 * scale;
      if (hitResult?.type === "border-row") {
        ctx.beginPath();
        const y0 = coordsLocations.rows[Math.max(0, hitResult.coord - 1)];
        const y1 = coordsLocations.rows[Math.max(1, hitResult.coord)];
        ctx.rect(0, y0, size.width, y1 - y0);
        applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: lineHighlightSize });
        ctx.stroke();

        ctx.beginPath();
        applyPath(ctx, hitResult.segment);
        applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: borderAnchorSize });
        ctx.stroke();
      }
      if (hitResult?.type === "border-column") {
        applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: lineHighlightSize });
        ctx.beginPath();
        const x0 = coordsLocations.columns[Math.max(0, hitResult.coord - 1)];
        const x1 = coordsLocations.columns[Math.max(1, hitResult.coord)];
        ctx.rect(x0, 0, x1 - x0, size.height);
        ctx.stroke();

        ctx.beginPath();
        applyPath(ctx, hitResult.segment);
        applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: borderAnchorSize });
        ctx.stroke();
      }

      applyFillStyle(ctx, { color: COLORS.WHITE });
      applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 3 * scale });
      addLineAnchors.forEach((a) => {
        ctx.beginPath();
        ctx.arc(a.p.x, a.p.y, anchorSize, 0, TAU);
        ctx.fill();
        renderPlusIcon(ctx, a.p, anchorSize * 1.8);
      });
      if (hitResult?.type === "add-row" || hitResult?.type === "add-column") {
        applyFillStyle(ctx, { color: style.selectionSecondaly });
        applyStrokeStyle(ctx, { color: COLORS.WHITE, width: 3 * scale });
        ctx.beginPath();
        ctx.arc(hitResult.p.x, hitResult.p.y, anchorSize, 0, TAU);
        ctx.fill();
        renderPlusIcon(ctx, hitResult.p, anchorSize * 1.8);
      }
    });
  }

  return {
    hitTest,
    render,
    isSameHitResult: (a, b) => {
      if (a?.type === "border-row" && b?.type === "border-row") {
        return a.coord === b.coord && a.opposite === b.opposite;
      }
      if (a?.type === "border-column" && b?.type === "border-column") {
        return a.coord === b.coord && a.opposite === b.opposite;
      }
      return false;
    },
  };
});
export type TableHandler = ReturnType<typeof newTableHandler>;

export type MovingInTableHitResult = {
  seg: ISegment;
  coords: TableCoords;
  findexBetween: [string | null, string | null];
};

type MovingInTableHandlerOption = {
  getShapeComposite: () => ShapeComposite;
  tableId: string;
};

export function newMovingInTableHandler(option: MovingInTableHandlerOption) {
  const shapeComposite = option.getShapeComposite();
  const shapeMap = shapeComposite.shapeMap;
  const table = shapeMap[option.tableId] as TableShape;
  const tableInfo = getTableShapeInfo(table);
  const coordsLocations = getTableCoordsLocations(tableInfo);

  const tableRect = {
    x: table.p.x,
    y: table.p.y,
    ...getTableSizeByInfo(tableInfo),
  };
  const { rotateAffine, derotateAffine } = getRotationAffines(table.rotation, getRectCenter(tableRect));

  function hitTest(p: IVec2): MovingInTableHitResult | undefined {
    if (!tableInfo) return;

    let result: MovingInTableHitResult | undefined;
    const derotatedP = applyAffine(derotateAffine, p);

    let y = table.p.y;
    const row =
      tableInfo.rows.find((r) => {
        y += r.size;
        return derotatedP.y < y;
      }) ?? tableInfo.rows.at(-1);
    let x = table.p.x;
    const column =
      tableInfo.columns.find((c) => {
        x += c.size;
        return derotatedP.x < x;
      }) ?? tableInfo.columns.at(-1);
    if (!row || !column) return;

    const baseCell: TableCoords = [row.id, column.id];
    const effectiveCells = getEffectiveCells(tableInfo, [baseCell]);
    const effectiveCoordsSet = new Set(effectiveCells.map((cell) => generateTableMeta(cell)));
    const coordsBoundsInfo = getCoordsBoundsInfo(tableInfo, [baseCell]);
    if (!coordsBoundsInfo) return;

    const indexCell = coordsBoundsInfo.bounds[0];
    const siblingIds = shapeComposite.mergedShapeTreeMap[table.id].children
      .map((c) => c.id)
      .filter((id) => {
        const s = shapeMap[id];
        const coordsMeta = parseTableMeta(s.parentMeta);
        return coordsMeta && effectiveCoordsSet.has(generateTableMeta(coordsMeta));
      });
    const siblingRects = siblingIds.map<[string, IRectangle]>((id) => {
      const rectPolygon = shapeComposite.getRectPolygonForLayout(shapeMap[id]);
      const derotatedRectPolygon = rectPolygon.map((p) => applyAffine(derotateAffine, p));
      return [id, getOuterRectangle([derotatedRectPolygon])];
    });

    if (siblingRects.length === 0) {
      // No siblings
      const effectiveCellRect = getEffectiveCellRect(tableInfo, coordsLocations, baseCell);
      const segX = table.p.x + effectiveCellRect.x + effectiveCellRect.width / 2;
      const segY0 = table.p.y + effectiveCellRect.y;
      const segY1 = table.p.y + effectiveCellRect.y + effectiveCellRect.height;
      result = {
        seg: [
          { x: segX, y: segY0 },
          { x: segX, y: segY1 },
        ],
        coords: [indexCell[0], indexCell[1]],
        findexBetween: [table.findex, null],
      };
    } else {
      // Seeg insertion position among the siblings
      const evaluated = siblingRects.map<[string, IRectangle, number]>(([id, rect]) => [
        id,
        rect,
        getDistanceBetweenPointAndRect(derotatedP, rect),
      ]);
      const [closestId, closestRect] = evaluated.sort((a, b) => a[2] - b[2])[0];
      const closestIndex = siblingIds.findIndex((id) => id === closestId);
      const closestShape = shapeMap[closestId];
      if (derotatedP.x < closestRect.x + closestRect.width / 2) {
        result = {
          seg: [
            { x: closestRect.x, y: closestRect.y },
            { x: closestRect.x, y: closestRect.y + closestRect.height },
          ],
          coords: [indexCell[0], indexCell[1]],
          findexBetween: [
            closestIndex === 0 ? null : shapeMap[siblingIds[closestIndex - 1]].findex,
            closestShape.findex,
          ],
        };
      } else {
        result = {
          seg: [
            { x: closestRect.x + closestRect.width, y: closestRect.y },
            { x: closestRect.x + closestRect.width, y: closestRect.y + closestRect.height },
          ],
          coords: [indexCell[0], indexCell[1]],
          findexBetween: [
            closestShape.findex,
            closestIndex === siblingIds.length - 1 ? null : shapeMap[siblingIds[closestIndex + 1]].findex,
          ],
        };
      }
    }

    if (result) {
      return {
        ...result,
        seg: [applyAffine(rotateAffine, result.seg[0]), applyAffine(rotateAffine, result.seg[1])],
      };
    }

    return;
  }

  function render(ctx: CanvasCTX, style: StyleScheme, scale: number, hitResult?: MovingInTableHitResult) {
    if (hitResult) {
      applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: style.selectionLineWidth * 2 * scale });
      ctx.beginPath();
      ctx.moveTo(hitResult.seg[0].x, hitResult.seg[0].y);
      ctx.lineTo(hitResult.seg[1].x, hitResult.seg[1].y);
      ctx.stroke();
    }
  }

  return { hitTest, render };
}
export type MovingInTableHandler = ReturnType<typeof newMovingInTableHandler>;

export function renderHighlightCells(
  ctx: CanvasCTX,
  style: StyleScheme,
  tableInfo: TableShapeInfo,
  cells: TableCoords[],
) {
  const effectiveCells = getEffectiveCells(tableInfo, cells);
  if (effectiveCells.length === 0) return;

  const coordsLocations = getTableCoordsLocations(tableInfo);
  const rowIndexMap = new Map<string, number>(tableInfo.rows.map((row, r) => [row.id, r]));
  const columnIndexMap = new Map<string, number>(tableInfo.columns.map((column, c) => [column.id, c]));
  scaleGlobalAlpha(ctx, 0.2, () => {
    applyFillStyle(ctx, { color: style.selectionPrimary });
    ctx.beginPath();
    effectiveCells.forEach((coord) => {
      const r = rowIndexMap.get(coord[0]);
      const c = columnIndexMap.get(coord[1]);
      if (r === undefined || c === undefined) return;

      const top = coordsLocations.rows[r];
      const bottom = coordsLocations.rows[r + 1];
      const left = coordsLocations.columns[c];
      const right = coordsLocations.columns[c + 1];
      ctx.rect(left, top, right - left, bottom - top);
    });
    ctx.fill();
  });
}

export function renderHighlightCellBorders(
  ctx: CanvasCTX,
  style: StyleScheme,
  scale: number,
  tableInfo: TableShapeInfo,
  cells: TableCoords[],
) {
  const effectiveCells = getEffectiveCells(tableInfo, cells);
  if (effectiveCells.length === 0) return;

  const coordsLocations = getTableCoordsLocations(tableInfo);
  const areas: MergeArea[] = [];
  effectiveCells.forEach((coords) => {
    const coordsBoundsInfo = getCoordsBoundsInfo(tableInfo, [coords]);
    if (!coordsBoundsInfo) return;
    areas.push(coordsBoundsInfo.mergeArea);
  });

  applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 6 * scale });
  ctx.beginPath();
  areas.forEach((area) => {
    const top = coordsLocations.rows[area[0][0]];
    const bottom = coordsLocations.rows[area[1][0] + 1];
    const left = coordsLocations.columns[area[0][1]];
    const right = coordsLocations.columns[area[1][1] + 1];
    ctx.rect(left, top, right - left, bottom - top);
  });
  ctx.stroke();
}

export function getEffectiveCells(tableInfo: TableShapeInfo, cells: TableCoords[]): TableCoords[] {
  const coordsByKey = new Map<string, TableCoords>();
  cells.forEach((cell) => {
    const coordsBoundsInfo = getCoordsBoundsInfo(tableInfo, [cell]);
    if (!coordsBoundsInfo) return;

    for (let r = coordsBoundsInfo.mergeArea[0][0]; r <= coordsBoundsInfo.mergeArea[1][0]; r++) {
      for (let c = coordsBoundsInfo.mergeArea[0][1]; c <= coordsBoundsInfo.mergeArea[1][1]; c++) {
        const coords: TableCoords = [tableInfo.rows[r].id, tableInfo.columns[c].id];
        coordsByKey.set(generateTableMeta(coords), coords);
      }
    }
  });
  return Array.from(coordsByKey.values());
}

function getEffectiveCellRect(
  tableInfo: TableShapeInfo,
  coordsLocations: { rows: number[]; columns: number[] },
  cell: TableCoords,
): IRectangle {
  const coordsBoundsInfo = getCoordsBoundsInfo(tableInfo, [cell]);
  if (!coordsBoundsInfo) return { x: 0, y: 0, width: 0, height: 0 };

  const adjustedRowFrom = tableInfo.rows.findIndex((r) => r.id === coordsBoundsInfo.bounds[0][0]);
  const adjustedColumnFrom = tableInfo.columns.findIndex((c) => c.id === coordsBoundsInfo.bounds[0][1]);
  const adjustedRowTo = tableInfo.rows.findIndex((r) => r.id === coordsBoundsInfo.bounds[1][0]);
  const adjustedColumnTo = tableInfo.columns.findIndex((c) => c.id === coordsBoundsInfo.bounds[1][1]);

  const left = coordsLocations.columns[adjustedColumnFrom];
  const right = coordsLocations.columns[adjustedColumnTo + 1];
  const top = coordsLocations.rows[adjustedRowFrom];
  const bottom = coordsLocations.rows[adjustedRowTo + 1];
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function generateTableMeta(coords: TableCoords): string {
  return coords.join(":");
}

export function getNextTableLayout(shapeComposite: ShapeComposite, rootId: string): { [id: string]: Partial<Shape> } {
  const layoutNodes = toLayoutNodes(shapeComposite, rootId);
  return getNextLayout(shapeComposite, rootId, layoutNodes, tableLayout);
}

type TableLayoutNodeWithMeta = LayoutNodeWithMeta<TableLayoutNode>;

function toLayoutNodes(shapeComposite: ShapeComposite, rootId: string): TableLayoutNodeWithMeta[] {
  const root = shapeComposite.mergedShapeTreeMap[rootId];
  const rootShape = shapeComposite.mergedShapeMap[root.id] as TableShape;
  const layoutNodes: TableLayoutNodeWithMeta[] = [];
  treeToLayoutNode(layoutNodes, shapeComposite, rootShape);
  return layoutNodes;
}

function treeToLayoutNode(result: TableLayoutNodeWithMeta[], shapeComposite: ShapeComposite, shape: Shape) {
  const treeNode = shapeComposite.mergedShapeTreeMap[shape.id];
  const rectPolygon = shapeComposite.getRectPolygonForLayout(shape);
  const c = getRectCenter(shapeComposite.getWrapperRect(shape));
  const p = rotate(rectPolygon[0], -shape.rotation, c);
  const rect = {
    x: p.x,
    y: p.y,
    width: getDistance(rectPolygon[0], rectPolygon[1]),
    height: getDistance(rectPolygon[0], rectPolygon[3]),
  };

  if (isTableShape(shape)) {
    const tableInfo = getTableShapeInfo(shape);
    result.push({
      id: shape.id,
      findex: shape.findex,
      parentId: shape.parentId ?? "",
      type: "box",
      rect,
      rows: tableInfo?.rows ?? [],
      columns: tableInfo?.columns ?? [],
      coords: parseTableMeta(shape.parentMeta),
      fullH: shape.lcH === 1,
      fullV: shape.lcV === 1,
      mergeAreas: tableInfo?.mergeAreas.map((m) => m.area),
      styleAreas: tableInfo?.alignStyleAreas,
    });

    treeNode.children.forEach((c) => {
      const child = shapeComposite.mergedShapeMap[c.id];
      const coords = parseTableMeta(child.parentMeta);
      if (!shapeComposite.isInTableCell(child) || !coords) return;

      const childRectPolygon = shapeComposite.getRectPolygonForLayout(child);
      const childC = getRectCenter(shapeComposite.getWrapperRect(child));
      const childP = rotate(childRectPolygon[0], -child.rotation, childC);
      const childRec = {
        x: childP.x,
        y: childP.y,
        width: getDistance(childRectPolygon[0], childRectPolygon[1]),
        height: getDistance(childRectPolygon[0], childRectPolygon[3]),
      };
      result.push({
        id: child.id,
        findex: child.findex,
        type: "entity",
        rect: childRec,
        parentId: shape.id,
        coords,
        fullH: child.lcH === 1,
        fullV: child.lcV === 1,
      });
    });
  }
}

function getNextLayout(
  shapeComposite: ShapeComposite,
  rootId: string,
  layoutNodes: LayoutNodeWithMeta<TableLayoutNode>[],
  layoutFn: LayoutFn<TableLayoutNode>,
): { [id: string]: Partial<Shape> } {
  const rootShape = shapeComposite.mergedShapeMap[rootId] as TableShape;
  const layoutNodeMap = toMap(layoutNodes);
  const tableNode = layoutNodeMap[rootId] as TableLayoutBox;
  const result = layoutFn(layoutNodes);

  const rootRotateAffine =
    rootShape.rotation !== 0 ? getRotatedAtAffine(getRectCenter(tableNode.rect), rootShape.rotation) : undefined;
  const ret: { [id: string]: Partial<Shape> } = {};

  result.forEach((r) => {
    const s = shapeComposite.shapeMap[r.id];
    const srcNode = layoutNodeMap[r.id];
    const v = sub(r.rect, srcNode.rect);
    const affines: AffineMatrix[] = [];
    if (rootRotateAffine) {
      affines.push(rootRotateAffine);
    }
    if (!isZero(v)) {
      affines.push([1, 0, 0, 1, v.x, v.y]);
    }

    // Don't handle table resize here
    // => Its size should change via its rows and columns
    if (s.id !== rootId && (r.rect.width !== srcNode.rect.width || r.rect.height !== srcNode.rect.height)) {
      affines.push(
        [1, 0, 0, 1, srcNode.rect.x, srcNode.rect.y],
        [r.rect.width / srcNode.rect.width, 0, 0, r.rect.height / srcNode.rect.height, 0, 0],
        [1, 0, 0, 1, -srcNode.rect.x, -srcNode.rect.y],
      );
    }

    if (s.rotation !== 0) {
      affines.push(getRotatedAtAffine(getRectCenter(srcNode.rect), -s.rotation));
    }

    if (s.id === rootId) {
      let val: Partial<TableShape> = {};

      // Keep top-left position of the table when it's rotated
      if (rootRotateAffine) {
        const originDiff = sub(
          applyAffine(rootRotateAffine, srcNode.rect),
          applyAffine(getRotatedAtAffine(getRectCenter(r.rect), s.rotation), r.rect),
        );
        if (!isZero(originDiff)) {
          affines.push([1, 0, 0, 1, originDiff.x, originDiff.y]);
        }
      }

      if (affines.length > 0) {
        val = shapeComposite.transformShape(s, multiAffines(affines));
      }

      // Apply line resizings
      const tableNodeResult = r as TableLayoutBox;
      tableNodeResult.rows.forEach((row, i) => {
        if (row.size !== tableNode.rows[i].size) {
          const id = row.id as TableRowKey;
          val[id] = { ...rootShape[id]!, size: row.size };
        }
      });
      tableNodeResult.columns.forEach((column, i) => {
        if (column.size !== tableNode.columns[i].size) {
          const id = column.id as TableColumnKey;
          val[id] = { ...rootShape[id]!, size: column.size };
        }
      });

      if (!isObjectEmpty(val)) {
        ret[s.id] = val;
      }
    } else {
      if (affines.length === 0) return;

      // Transfrom each child as a whole
      const affine = multiAffines(affines);
      shapeComposite.getAllTransformTargets([s.id]).forEach((target) => {
        const val = shapeComposite.transformShape(target, affine);
        if (!isObjectEmpty(val)) {
          ret[target.id] = val;
        }
      });
    }
  });

  return ret;
}

/**
 * "resizeFn" receives affine matrix that transforms the bounds of the target line.
 */
export function newResizeColumn(table: TableShape, coord: number, opposite = false) {
  const info = getColumnBoundsInfo(table, coord);
  if (!info) return;

  const { path, rotateFn, column, lineBounds } = info;
  const origin = opposite ? path[2] : path[0];

  return {
    linePath: path,
    resizeFn: (affine: AffineMatrix) => {
      const resizedLinePath = path.map((p) => applyAffine(affine, p));
      const deroratedResizedLinePath = resizedLinePath.map((p) => rotateFn(p, true));
      const nextLineWidth = deroratedResizedLinePath[2].x - deroratedResizedLinePath[0].x;
      const diff = nextLineWidth - lineBounds.width;
      const patch: Partial<TableShape> = {};
      const size = column.size + diff;
      patch[column.id] = { ...column, size, baseSize: size };
      const nextTarget = { ...table, ...patch } as TableShape;
      const nextInfo = getColumnBoundsInfo(nextTarget, coord)!;
      const nextOrigin = opposite ? nextInfo.path[2] : nextInfo.path[0];
      if (!isSame(origin, nextOrigin)) {
        patch.p = add(nextTarget.p, sub(origin, nextOrigin));
      }
      return patch;
    },
  };
}

function getColumnBoundsInfo(table: TableShape, coord: number) {
  const tableInfo = getTableShapeInfo(table);
  const column = tableInfo?.columns[Math.max(0, coord - 1)];
  if (!column) return;

  const size = getTableSizeByInfo(tableInfo);
  const cls = getTableCoordsLocations(tableInfo);
  let l = cls.columns[0];
  let r = cls.columns[1];
  if (coord > 0) {
    l = cls.columns[coord - 1];
    r = cls.columns[coord];
  }
  const lineBounds = { x: l + table.p.x, y: table.p.y, width: r - l, height: size.height };
  const shapeRect = {
    x: table.p.x,
    y: table.p.y,
    width: size.width,
    height: size.height,
  };
  const rotateFn = getRotateFn(table.rotation, getRectCenter(shapeRect));
  return { path: getRectPoints(lineBounds).map((p) => rotateFn(p)), rotateFn, column, lineBounds };
}

/**
 * "resizeFn" receives affine matrix that transforms the bounds of the target line.
 */
export function newResizeRow(table: TableShape, coord: number, opposite = false) {
  const info = getRowBoundsInfo(table, coord);
  if (!info) return;

  const { path, rotateFn, row, lineBounds } = info;
  const origin = opposite ? path[2] : path[0];

  return {
    linePath: path,
    resizeFn: (affine: AffineMatrix) => {
      const resizedLinePath = path.map((p) => applyAffine(affine, p));
      const deroratedResizedLinePath = resizedLinePath.map((p) => rotateFn(p, true));
      const nextLineHeight = deroratedResizedLinePath[2].y - deroratedResizedLinePath[0].y;
      const diff = nextLineHeight - lineBounds.height;
      const patch: Partial<TableShape> = {};
      const size = row.size + diff;
      patch[row.id] = { ...row, size, baseSize: size };
      const nextTarget = { ...table, ...patch } as TableShape;
      const nextInfo = getRowBoundsInfo(nextTarget, coord)!;
      const nextOrigin = opposite ? nextInfo.path[2] : nextInfo.path[0];
      if (!isSame(origin, nextOrigin)) {
        patch.p = add(nextTarget.p, sub(origin, nextOrigin));
      }
      return patch;
    },
  };
}

function getRowBoundsInfo(table: TableShape, coord: number) {
  const tableInfo = getTableShapeInfo(table);
  const row = tableInfo?.rows[Math.max(0, coord - 1)];
  if (!row) return;

  const size = getTableSizeByInfo(tableInfo);
  const cls = getTableCoordsLocations(tableInfo);
  let t = cls.rows[0];
  let b = cls.rows[1];
  if (coord > 0) {
    t = cls.rows[coord - 1];
    b = cls.rows[coord];
  }
  const lineBounds = { x: table.p.x, y: t + table.p.y, width: size.width, height: b - t };
  const shapeRect = {
    x: table.p.x,
    y: table.p.y,
    width: size.width,
    height: size.height,
  };
  const rotateFn = getRotateFn(table.rotation, getRectCenter(shapeRect));
  return { path: getRectPoints(lineBounds).map((p) => rotateFn(p)), rotateFn, row, lineBounds };
}

export function getPatchInfoByAddRows(
  shapeComposite: ShapeComposite,
  table: TableShape,
  coord: number,
  src: TableRow[],
): Partial<TableShape> {
  const tableInfo = getTableShapeInfo(table);
  return adjustPatchByKeepPosition(shapeComposite, table, getPatchInfoByAddLines(tableInfo?.rows ?? [], coord, src));
}

export function getPatchInfoByAddColumns(
  shapeComposite: ShapeComposite,
  table: TableShape,
  coord: number,
  src: TableColumn[],
): Partial<TableShape> {
  const tableInfo = getTableShapeInfo(table);
  return adjustPatchByKeepPosition(shapeComposite, table, getPatchInfoByAddLines(tableInfo?.columns ?? [], coord, src));
}

/**
 * "coord" represent the border between lines for the insertion
 */
export function getPatchInfoByInsertRow(
  shapeComposite: ShapeComposite,
  table: TableShape,
  coord: number,
  generateUuid: () => string,
): Partial<TableShape> {
  const tableInfo = getTableShapeInfo(table);
  const src = tableInfo?.rows[Math.max(0, coord - 1)];
  if (!src) return {};

  return adjustPatchByKeepPosition(
    shapeComposite,
    table,
    getPatchInfoByAddLines(
      tableInfo?.rows ?? [],
      coord,
      [src].map((s) => ({ ...s, id: `r_${generateUuid()}` })),
    ),
  );
}

/**
 * "coord" represent the border between lines for the insertion
 */
export function getPatchInfoByInsertColumn(
  shapeComposite: ShapeComposite,
  table: TableShape,
  coord: number,
  generateUuid: () => string,
): Partial<TableShape> {
  const tableInfo = getTableShapeInfo(table);
  const src = tableInfo?.columns[Math.max(0, coord - 1)];
  if (!src) return {};

  return adjustPatchByKeepPosition(
    shapeComposite,
    table,
    getPatchInfoByAddLines(
      tableInfo?.columns ?? [],
      coord,
      [src].map((s) => ({ ...s, id: `c_${generateUuid()}` })),
    ),
  );
}

/**
 * "coord = 0" => Add to the head
 * "src" is added as new lines with adjusted findex.
 * => Their IDs should already be unique in the table.
 */
export function getPatchInfoByAddLines<T extends TableRow | TableColumn>(
  lines: TableShapeInfo["rows"] | TableShapeInfo["columns"],
  coord: number,
  src: T[],
): Partial<TableShape> {
  let findexList: string[];
  if (lines.length > 0) {
    if (coord <= 0) {
      findexList = generateNKeysBetweenAllowSame(undefined, lines.at(0)?.findex, src.length);
    } else if (lines.length <= coord) {
      findexList = generateNKeysBetweenAllowSame(lines.at(-1)?.findex, undefined, src.length);
    } else {
      findexList = generateNKeysBetweenAllowSame(lines.at(coord - 1)?.findex, lines.at(coord)?.findex, src.length);
    }
  } else {
    findexList = generateNKeysBetweenAllowSame(undefined, undefined, src.length);
  }

  const patch: Partial<TableShape> = {};
  src.forEach((r: any, i) => {
    patch[r.id] = { ...r, findex: findexList[i] };
  });

  return patch;
}

/**
 * "lineIds" can contain both rows and columns.
 * Returned value "delete" contains IDs of shapes that belong to deleted lines.
 */
export function getPatchByDeleteLines(
  shapeComposite: ShapeComposite,
  table: TableShape,
  lineIds: string[],
): EntityPatchInfo<Shape> {
  const tableInfo = getTableShapeInfo(table);
  if (!tableInfo) return {};

  let patch: Partial<TableShape> = {};

  lineIds.forEach((id: any) => {
    patch[id] = undefined;
  });

  patch = {
    ...patch,
    ...adjustPatchByKeepPosition(shapeComposite, table, patch),
  };

  const targetLineIdSet = new Set(lineIds);
  const rowIds = tableInfo.rows.map((r) => r.id);
  const columnIds = tableInfo.columns.map((c) => c.id);
  const patchForMerge = getPatchForAreaByDeleteLines(tableInfo, rowIds, columnIds, targetLineIdSet, tableInfo.merges);
  const patchForFillStyle = getPatchForAreaByDeleteLines(
    tableInfo,
    rowIds,
    columnIds,
    targetLineIdSet,
    tableInfo.fillStyles,
  );
  const patchForAlignStyle = getPatchForAreaByDeleteLines(
    tableInfo,
    rowIds,
    columnIds,
    targetLineIdSet,
    tableInfo.alignStyles,
  );
  patch = { ...patch, ...patchForMerge, ...patchForFillStyle, ...patchForAlignStyle };

  const idSet = new Set(lineIds);

  const update = { [table.id]: patch };
  const deleteIds: string[] = [];
  shapeComposite.shapes.forEach((s) => {
    if (s.parentId !== table.id) return;

    const coords = parseTableMeta(s.parentMeta);
    if (!coords) return;

    const info = getCoordsBoundsInfo(tableInfo, [coords]);
    const indexCoords = info?.bounds[0] ?? coords;
    if (idSet.has(indexCoords[0]) || idSet.has(indexCoords[1])) {
      // Delete only when the index cell is deleted
      deleteIds.push(s.id);
    } else if (idSet.has(coords[0]) || idSet.has(coords[1])) {
      // Move to the index cell when the original cell is deleted
      update[s.id] = { parentMeta: generateTableMeta(indexCoords) };
    }
  });

  return {
    update,
    delete: deleteIds.length > 0 ? deleteIds : undefined,
  };
}

function getNextAvailableLineId(
  lineIds: string[],
  target: string,
  disabledSet: Set<string>,
): [number, string] | undefined {
  const targetIndex = lineIds.findLastIndex((id) => id === target);
  if (targetIndex < 0) return;

  for (let i = targetIndex + 1; i < lineIds.length; i++) {
    const id = lineIds[i];
    if (!disabledSet.has(id)) {
      return [i, id];
    }
  }
}

function getPatchForAreaByDeleteLines<T extends TableCellMerge | TableCellStyle>(
  tableInfo: TableShapeInfo,
  rowIds: string[],
  columnIds: string[],
  targetLineIdSet: Set<string>,
  areas: T[],
) {
  const patch: Record<string, T | undefined> = {};
  areas.forEach((s) => {
    if (targetLineIdSet.has(s.a[0])) {
      const adjustedId = getNextAvailableLineId(rowIds, s.a[0], targetLineIdSet);
      patch[s.id] = adjustedId ? { ...s, a: [tableInfo.rows[adjustedId[0]].id, s.a[1]] } : undefined;
    } else if (targetLineIdSet.has(s.b[0])) {
      const adjustedId = getPreviousAvailableLineId(rowIds, s.b[0], targetLineIdSet);
      patch[s.id] = adjustedId ? { ...s, b: [tableInfo.rows[adjustedId[0]].id, s.b[1]] } : undefined;
    } else if (targetLineIdSet.has(s.a[1])) {
      const adjustedId = getNextAvailableLineId(columnIds, s.a[1], targetLineIdSet);
      patch[s.id] = adjustedId ? { ...s, a: [s.a[0], tableInfo.columns[adjustedId[0]].id] } : undefined;
    } else if (targetLineIdSet.has(s.b[1])) {
      const adjustedId = getPreviousAvailableLineId(columnIds, s.b[1], targetLineIdSet);
      patch[s.id] = adjustedId ? { ...s, b: [s.b[0], tableInfo.columns[adjustedId[0]].id] } : undefined;
    }
  });
  return patch;
}

function getPreviousAvailableLineId(
  lineIds: string[],
  target: string,
  disabledSet: Set<string>,
): [number, string] | undefined {
  const targetIndex = lineIds.findLastIndex((id) => id === target);
  if (targetIndex < 0) return;

  for (let i = targetIndex - 1; 0 <= i; i--) {
    const id = lineIds[i];
    if (!disabledSet.has(id)) {
      return [i, id];
    }
  }
}

/**
 * Returned item has "coords" that represents the index cell
 */
export function getShapesInTableLines(
  shapeComposite: ShapeComposite,
  tableId: string,
  tableInfo: TableShapeInfo,
  lineIds: (TableRowKey | TableColumnKey)[],
): { id: string; coords: TableCoords }[] {
  const idSet = new Set(lineIds);

  const ret: { id: string; coords: TableCoords }[] = [];
  shapeComposite.shapes.forEach((s) => {
    if (s.parentId !== tableId) return;

    const coords = parseTableMeta(s.parentMeta);
    if (!coords) return;

    const info = getCoordsBoundsInfo(tableInfo, [coords]);
    const indexCoords = info?.bounds[0] ?? coords;
    if (idSet.has(indexCoords[0]) || idSet.has(indexCoords[1])) {
      ret.push({ id: s.id, coords: indexCoords });
    }
  });
  return ret;
}

export function adjustPatchByKeepPosition(
  shapeComposite: ShapeComposite,
  table: TableShape,
  patch: Partial<TableShape>,
): Partial<TableShape> {
  const nextTable = { ...table, ...patch };
  const v = sub(shapeComposite.getLocalRectPolygon(table)[0], shapeComposite.getLocalRectPolygon(nextTable)[0]);
  if (!isZero(v)) {
    return { ...patch, p: add(nextTable.p, v) };
  }
  return patch;
}

export function getPatchByMergeCells(
  table: TableShape,
  coordsList: TableCoords[],
  generateUuid: () => string,
): Partial<TableShape> {
  let patch: Partial<TableShape> = {};
  const tableInfo = getTableShapeInfo(table);
  if (!tableInfo) return {};

  const coordsBoundsInfo = getCoordsBoundsInfo(tableInfo, coordsList);
  if (!coordsBoundsInfo) return {};

  const { bounds: coordsBounds, touchIds } = coordsBoundsInfo;
  const merge: TableCellMerge = {
    id: `m_${generateUuid()}`,
    a: [coordsBounds[0][0], coordsBounds[0][1]],
    b: [coordsBounds[1][0], coordsBounds[1][1]],
  };

  patch[merge.id] = merge;
  touchIds.forEach((id) => {
    patch[id] = undefined;
  });

  return patch;
}

export function getPatchByUnmergeCells(table: TableShape, coordsList: TableCoords[]): Partial<TableShape> {
  let patch: Partial<TableShape> = {};
  const tableInfo = getTableShapeInfo(table);
  if (!tableInfo) return {};

  const coordsBoundsInfo = getCoordsBoundsInfo(tableInfo, coordsList);
  if (!coordsBoundsInfo) return {};

  const { touchIds } = coordsBoundsInfo;
  touchIds.forEach((id) => {
    patch[id] = undefined;
  });
  return patch;
}

/**
 * "styleValue" has to have only one style value.
 * e.g. It can't have both "fill" and "vAlign" at the same time.
 */
export function getPatchByApplyCellStyle(
  tableInfo: TableShapeInfo,
  coordsList: TableCoords[],
  styleValue: TableCellStyleValue,
  generateUuid: () => string,
): Partial<TableShape> {
  const patch: Partial<TableShape> = {};
  const effectiveCells = getEffectiveCells(tableInfo, coordsList);

  const rowIndexById = new Map(tableInfo.rows.map((r, i) => [r.id, i]));
  const columnIndexById = new Map(tableInfo.columns.map((c, i) => [c.id, i]));
  const cellAreas = optimizeCoords(rowIndexById, columnIndexById, effectiveCells);

  type Bounds = Exclude<ReturnType<typeof getCoordsBoundsInfo>, undefined>["bounds"];
  const styleIdByBounds = new Map<Bounds, TableCellStyleKey>();

  cellAreas.forEach((cellArea) => {
    // Always add new style even if it's disabled
    // => To override cell styles come from other area
    const id: TableCellStyleKey = `s_${generateUuid()}`;
    patch[id] = { ...cellArea, ...styleValue, id };
    styleIdByBounds.set([cellArea.a, cellArea.b], id);
  });

  const boundsList: Bounds[] = [];
  styleIdByBounds.forEach((_, bounds) => {
    boundsList.push(bounds);
  });
  effectiveCells.forEach((coords) => {
    const coordsBoundsInfo = getCoordsBoundsInfo(tableInfo, [coords]);
    if (!coordsBoundsInfo) return;
    boundsList.push(coordsBoundsInfo.bounds);
  });

  let currentStyles: TableCellStyle[];
  switch (getCellStyleType(styleValue)) {
    case 1: {
      currentStyles = tableInfo.fillStyles;
      break;
    }
    case 2: {
      currentStyles = tableInfo.alignStyles;
      break;
    }
  }

  const resolvedPatch = getPatchByResolveCellStyle(
    rowIndexById,
    columnIndexById,
    boundsList,
    styleIdByBounds,
    patch,
    currentStyles,
  );
  mapEach(resolvedPatch, (v, k) => {
    if (v === undefined && k in patch) {
      // Revert the new style
      delete patch[k];
    } else {
      patch[k] = v;
    }
  });

  return patch;
}

type CoordsBounds = Exclude<ReturnType<typeof getCoordsBoundsInfo>, undefined>["bounds"];

function getPatchByResolveCellStyle(
  rowIndexById: Map<string, number>,
  columnIndexById: Map<string, number>,
  boundsList: CoordsBounds[],
  styleIdByBounds: Map<CoordsBounds, TableCellStyleKey>,
  currentPatch: Partial<TableShape>,
  currentStyles: TableCellStyle[],
): Pick<TableShape, TableCellStyleKey> {
  const patch: Partial<TableShape> = {};
  const processedSet = new Set<string>();

  // Delete current styles that are encompassed by the new style area and don't have additional fields.
  boundsList.forEach((b) => {
    const bar = rowIndexById.get(b[0][0]) ?? -Infinity;
    const bac = columnIndexById.get(b[0][1]) ?? -Infinity;
    const bbr = rowIndexById.get(b[1][0]) ?? Infinity;
    const bbc = columnIndexById.get(b[1][1]) ?? Infinity;
    const styleIdOfBounds = styleIdByBounds.get(b);

    currentStyles.forEach((s) => {
      if (s.id in patch) return;

      const sar = rowIndexById.get(s.a[0]);
      const sac = columnIndexById.get(s.a[1]);
      const sbr = rowIndexById.get(s.b[0]);
      const sbc = columnIndexById.get(s.b[1]);
      if (sar === undefined || sac === undefined || sbr === undefined || sbc === undefined) {
        patch[s.id] = undefined;
      } else {
        if (styleIdOfBounds && bar === sar && bac == sac && bbr === sbr && bbc === sbc) {
          if (processedSet.has(styleIdOfBounds)) {
            // Discard this style since new one is already inherited
            patch[s.id] = undefined;
          } else {
            // Patch the style data when it has the same bounds of a newly created style
            patch[s.id] = { ...s, ...currentPatch[styleIdOfBounds], id: s.id };
            patch[styleIdOfBounds] = undefined;
            processedSet.add(styleIdOfBounds);
          }
        } else if (
          isInMergeArea(
            [
              [bar, bac],
              [bbr, bbc],
            ],
            [
              [sar, sac],
              [sbr, sbc],
            ],
            true,
          )
        ) {
          // Delete the current one
          patch[s.id] = undefined;
        }
      }
    });
  });

  return patch;
}

/**
 * Migrating existing styles to clear target cells is too complicated
 * => Overwrite them with empty style
 */
export function getPatchByClearCellStyle(
  tableInfo: TableShapeInfo,
  coordsList: TableCoords[],
  generateUuid: () => string,
  getTimestamp: () => number,
): Partial<TableShape> {
  return getPatchByApplyCellStyle(tableInfo, coordsList, { t: getTimestamp() }, generateUuid);
}

export function getPatchByFitLines(table: TableShape, lineIds: string[]): Partial<TableShape> {
  return lineIds.reduce<Partial<TableShape>>((p, v) => {
    const line = table[v as TableRowKey | TableColumnKey];
    if (line) {
      p[line.id] = { ...(line as typeof line & { id: any }), baseSize: line.size, fit: true };
    }
    return p;
  }, {});
}

export function getPatchByUnfitLines(table: TableShape, lineIds: string[]): Partial<TableShape> {
  return lineIds.reduce<Partial<TableShape>>((p, v) => {
    const key = v as TableRowKey | TableColumnKey;
    const line = table[key];
    if (line) {
      p[key] = { id: line.id as any, findex: line.findex, size: line.size };
    }
    return p;
  }, {});
}

function optimizeCoords(
  rowIndexById: Map<string, number>,
  columnIndexById: Map<string, number>,
  coordsList: TableCoords[],
): TableCellArea[] {
  const coordsWithIndex: CellInfo<TableCoords>[] = [];
  coordsList.map((coords) => {
    const r0 = rowIndexById.get(coords[0]);
    const c0 = columnIndexById.get(coords[1]);
    if (r0 === undefined || c0 === undefined) return;

    coordsWithIndex.push([coords, r0, c0]);
  });
  const groups = groupCellsIntoRectangles(coordsWithIndex);
  return groups.map<TableCellArea>((group) => {
    let r0 = group[0];
    let r1 = group[0];
    let c0 = group[0];
    let c1 = group[0];
    group.forEach((cell) => {
      r0 = cell[1] < r0[1] ? cell : r0;
      r1 = r1[1] < cell[1] ? cell : r1;
      c0 = cell[2] < c0[2] ? cell : c0;
      c1 = c1[2] < cell[2] ? cell : c1;
    });
    return { a: [r0[0][0], c0[0][1]], b: [r1[0][0], c1[0][1]] };
  });
}
