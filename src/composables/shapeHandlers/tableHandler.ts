import { applyAffine, getDistance, getOuterRectangle, getRectCenter, IRectangle, IVec2, rotate } from "okageo";
import { Shape, StyleScheme } from "../../models";
import { getTableShapeInfo, getTableSize, isTableShape, TableShape } from "../../shapes/table/table";
import { getDistanceBetweenPointAndRect, getRotationAffines, ISegment } from "../../utils/geometry";
import { ShapeComposite } from "../shapeComposite";
import { TableCoords, tableLayout, TableLayoutNode } from "../../utils/layouts/table";
import { CanvasCTX } from "../../utils/types";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { getNextLayout, LayoutNodeWithMeta } from "./layoutHandler";

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
    ...getTableSize(table),
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
