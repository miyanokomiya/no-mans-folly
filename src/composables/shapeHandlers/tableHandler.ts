import {
  add,
  AffineMatrix,
  applyAffine,
  getDistance,
  getOuterRectangle,
  getRectCenter,
  IRectangle,
  isSame,
  IVec2,
  rotate,
  sub,
} from "okageo";
import { Shape, StyleScheme } from "../../models";
import {
  getTableCoordsLocations,
  getTableShapeInfo,
  getTableSizeByInfo,
  isTableShape,
  TableShape,
} from "../../shapes/table/table";
import {
  getDistanceBetweenPointAndRect,
  getRectPoints,
  getRotateFn,
  getRotationAffines,
  ISegment,
  isPointCloseToSegment,
} from "../../utils/geometry";
import { ShapeComposite } from "../shapeComposite";
import { TableCoords, tableLayout, TableLayoutNode } from "../../utils/layouts/table";
import { CanvasCTX } from "../../utils/types";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { getNextLayout, LayoutNodeWithMeta } from "./layoutHandler";
import { defineShapeHandler } from "./core";
import { applyLocalSpace } from "../../utils/renderer";

const BorderThreshold = 5;

// "coord" is from 0 to the number of lines. 0 refers to the head line.
type BorderAnchor = { type: "border-row" | "border-column"; coord: number; segment: ISegment };

export type TableHitResult = BorderAnchor;

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
    const extra = 40 * scale;
    coordsLocations.rows.forEach((y, r) => {
      ret.push({
        type: "border-row",
        coord: r,
        segment: [
          { x: -extra, y },
          { x: r === 0 || r === coordsLocations.rows.length - 1 ? 0 : size.width, y },
        ],
      });
    });
    coordsLocations.columns.forEach((x, c) => {
      ret.push({
        type: "border-column",
        coord: c,
        segment: [
          { x, y: -extra },
          { x, y: c === 0 || c === coordsLocations.columns.length - 1 ? 0 : size.height },
        ],
      });
    });
    return ret;
  }

  function hitTest(p: IVec2, scale = 1): TableHitResult | undefined {
    const adjustedP = sub(rotateFn(p, true), shape.p);
    const borderThreshold = BorderThreshold * scale;

    const borderAnchor = getBorderAnchors(scale).find((a) => {
      return isPointCloseToSegment(a.segment, adjustedP, borderThreshold);
    });
    if (borderAnchor) return borderAnchor;
  }

  function render(ctx: CanvasCTX, style: StyleScheme, scale: number, hitResult?: TableHitResult) {
    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      const borderAnchors = getBorderAnchors(scale);
      applyStrokeStyle(ctx, { color: style.transformAnchor, width: 4 * scale });
      ctx.beginPath();
      borderAnchors.forEach((a) => {
        ctx.moveTo(a.segment[0].x, a.segment[0].y);
        ctx.lineTo(a.segment[1].x, a.segment[1].y);
      });
      ctx.stroke();

      if (hitResult?.type === "border-row" || hitResult?.type === "border-column") {
        applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: 4 * scale });
        ctx.beginPath();
        ctx.moveTo(hitResult.segment[0].x, hitResult.segment[0].y);
        ctx.lineTo(hitResult.segment[1].x, hitResult.segment[1].y);
        ctx.stroke();
      }
    });
  }

  return {
    hitTest,
    render,
    isSameHitResult: (a, b) => {
      if (a?.type === "border-row" && b?.type === "border-row") {
        return a.coord === b.coord;
      }
      if (a?.type === "border-column" && b?.type === "border-column") {
        return a.coord === b.coord;
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
    let rangeV = [y, y];
    const row =
      tableInfo.rows.find((r) => {
        rangeV[0] = y;
        y += r.size;
        rangeV[1] = y;
        return derotatedP.y < y;
      }) ?? tableInfo.rows.at(-1);

    let x = table.p.x;
    let rangeH = [x, x];
    const column =
      tableInfo.columns.find((c) => {
        rangeH[0] = x;
        x += c.size;
        rangeH[1] = x;
        return derotatedP.x < x;
      }) ?? tableInfo.columns.at(-1);

    if (!row || !column) return;

    const siblingIds = shapeComposite.mergedShapeTreeMap[table.id].children
      .map((c) => c.id)
      .filter((id) => {
        const s = shapeMap[id];
        const coords = parseTableMeta(s.parentMeta);
        return coords && coords[0] === row.id && coords[1] === column.id;
      });
    const siblingRects = siblingIds.map<[string, IRectangle]>((id) => {
      const rectPolygon = shapeComposite.getRectPolygonForLayout(shapeMap[id]);
      const derotatedRectPolygon = rectPolygon.map((p) => applyAffine(derotateAffine, p));
      return [id, getOuterRectangle([derotatedRectPolygon])];
    });

    if (siblingRects.length === 0) {
      // No siblings
      result = {
        seg: [
          { x: (rangeH[0] + rangeH[1]) / 2, y: rangeV[0] },
          { x: (rangeH[0] + rangeH[1]) / 2, y: rangeV[1] },
        ],
        coords: [row.id, column.id],
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
          coords: [row.id, column.id],
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
          coords: [row.id, column.id],
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

function parseTableMeta(meta?: string): TableCoords | undefined {
  if (!meta) return;

  const result = meta.split(/\s*:\s*/);
  return result.length === 2 ? (result as TableCoords) : undefined;
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
    });

    treeNode.children.forEach((c) => {
      const child = shapeComposite.mergedShapeMap[c.id];
      const coords = parseTableMeta(child.parentMeta);
      if (!coords) return;

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
      });
    });
  }
}

export function newResizeColumn(table: TableShape, coord: number) {
  const info = getColumnBoundsInfo(table, coord);
  if (!info) return;

  const { path, rotateFn, column, lineBounds } = info;
  const origin = coord === 0 ? path[2] : path[0];

  return {
    linePath: path,
    resizeFn: (affine: AffineMatrix) => {
      const resizedLinePath = path.map((p) => applyAffine(affine, p));
      const deroratedResizedLinePath = resizedLinePath.map((p) => rotateFn(p, true));
      const nextLineWidth = deroratedResizedLinePath[2].x - deroratedResizedLinePath[0].x;
      const diff = nextLineWidth - lineBounds.width;
      const patch: Partial<TableShape> = {
        [column.id]: { ...column, size: column.size + diff },
      } as any;
      const nextTarget = { ...table, ...patch } as TableShape;
      const nextInfo = getColumnBoundsInfo(nextTarget, coord)!;
      const nextOrigin = coord === 0 ? nextInfo.path[2] : nextInfo.path[0];
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

export function newResizeRow(table: TableShape, coord: number) {
  const info = getRowBoundsInfo(table, coord);
  if (!info) return;

  const { path, rotateFn, row, lineBounds } = info;
  const origin = coord === 0 ? path[2] : path[0];

  return {
    linePath: path,
    resizeFn: (affine: AffineMatrix) => {
      const resizedLinePath = path.map((p) => applyAffine(affine, p));
      const deroratedResizedLinePath = resizedLinePath.map((p) => rotateFn(p, true));
      const nextLineHeight = deroratedResizedLinePath[2].y - deroratedResizedLinePath[0].y;
      const diff = nextLineHeight - lineBounds.height;
      const patch: Partial<TableShape> = {
        [row.id]: { ...row, size: row.size + diff },
      } as any;
      const nextTarget = { ...table, ...patch } as TableShape;
      const nextInfo = getRowBoundsInfo(nextTarget, coord)!;
      const nextOrigin = coord === 0 ? nextInfo.path[2] : nextInfo.path[0];
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
