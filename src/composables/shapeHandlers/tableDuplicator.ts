import { EntityPatchInfo, Shape } from "../../models";
import { DocOutput } from "../../models/document";
import {
  getTableShapeInfo,
  parseTableMeta,
  TableCellMerge,
  TableCellStyle,
  TableColumn,
  TableColumnKey,
  TableCoords,
  TableRow,
  TableRowKey,
  TableShape,
  TableShapeInfo,
} from "../../shapes/table/table";
import { duplicateShapes } from "../../shapes/utils/duplicator";
import { findexSortFn } from "../../utils/commons";
import { splitIntoRangeGroups } from "../../utils/geometry";
import { ShapeComposite } from "../shapeComposite";
import {
  adjustPatchByKeepPosition,
  generateTableMeta,
  getPatchInfoByAddLines,
  getShapesInTableLines,
} from "./tableHandler";

/**
 * See "getPatchInfoByDuplicateLines"
 */
export function getPatchInfoByDuplicateRows(
  shapeComposite: ShapeComposite,
  docs: [id: string, doc: DocOutput][],
  generateUuid: () => string,
  table: TableShape,
  coordsList: TableRowKey[],
): { patch: EntityPatchInfo<Shape>; docMap: Record<string, DocOutput> } | undefined {
  const tableInfo = getTableShapeInfo(table);
  if (!tableInfo) return;

  return getPatchInfoByDuplicateLines(shapeComposite, docs, generateUuid, 0, table, tableInfo, coordsList);
}

/**
 * See "getPatchInfoByDuplicateLines"
 */
export function getPatchInfoByDuplicateColumns(
  shapeComposite: ShapeComposite,
  docs: [id: string, doc: DocOutput][],
  generateUuid: () => string,
  table: TableShape,
  coordsList: TableColumnKey[],
): { patch: EntityPatchInfo<Shape>; docMap: Record<string, DocOutput> } | undefined {
  const tableInfo = getTableShapeInfo(table);
  if (!tableInfo) return;

  return getPatchInfoByDuplicateLines(shapeComposite, docs, generateUuid, 1, table, tableInfo, coordsList);
}

type GetLineKey<T> = T extends TableRow ? TableRowKey : TableColumnKey;

/**
 * "coordList" represent the lines for the duplication.
 * Duplicated lines will inherit the order of "coordList".
 * Duplicated lines will be inserted after the last line of the targets.
 */
function getPatchInfoByDuplicateLines<T extends TableRow | TableColumn>(
  shapeComposite: ShapeComposite,
  docs: [id: string, doc: DocOutput][],
  generateUuid: () => string,
  targetCoordIndex: 0 | 1,
  table: TableShape,
  tableInfo: TableShapeInfo,
  coordsList: GetLineKey<T>[],
) {
  const generateLineId = targetCoordIndex === 0 ? () => `r_${generateUuid()}` : () => `c_${generateUuid()}`;
  const lines = targetCoordIndex === 0 ? tableInfo.rows : tableInfo.columns;

  const src = coordsList.map((v) => table[v]! as T);
  const duplicatedLineIdByOldId = new Map<string, string>(src.map((l) => [l.id, generateLineId()]));
  const duplicatedLines = src.map<T>((s) => ({ ...s, id: duplicatedLineIdByOldId.get(s.id)! }));
  const lastCoord = lines.findIndex((r) => r.id === src.at(-1)?.id);
  if (lastCoord < 0) return;

  const coordToInsert = lastCoord < 0 ? lines.length : lastCoord + 1;
  const tablePatch = adjustPatchByKeepPosition(
    shapeComposite,
    table,
    getPatchInfoByAddLines(lines, coordToInsert, duplicatedLines),
  );

  const contents = getShapesInTableLines(
    shapeComposite,
    table.id,
    tableInfo,
    src.map((l) => l.id),
  );
  const srcShapes = shapeComposite.getAllBranchMergedShapes(contents.map((c) => c.id));
  const lastFIndex = srcShapes.toSorted(findexSortFn).at(-1)?.findex ?? table.findex;
  const availableIdSet = new Set(shapeComposite.shapes.map((s) => s.id));
  const duplicatedShapeInfo = duplicateShapes(
    shapeComposite.getShapeStruct,
    srcShapes,
    docs,
    generateUuid,
    lastFIndex,
    availableIdSet,
    undefined,
    true,
  );
  const duplicatedShapes = duplicatedShapeInfo.shapes.map((s) => {
    if (s.parentId !== table.id) return s;

    const srcCoord = parseTableMeta(s.parentMeta);
    if (!srcCoord) return s;

    const [targetCoord, otherCoord] = targetCoordIndex === 0 ? srcCoord : [srcCoord[1], srcCoord[0]];
    const duplicatedCoord = duplicatedLineIdByOldId.get(targetCoord);
    if (!duplicatedCoord) return s;

    const parentMeta = generateTableMeta(
      (targetCoordIndex === 0 ? [duplicatedCoord, otherCoord] : [otherCoord, duplicatedCoord]) as TableCoords,
    );
    return { ...s, parentMeta };
  });

  const patch = { ...tablePatch };
  const duplicatedStyles = getPatchInfoByDuplicateLineStyles(
    (src, start, end) => ({
      ...src,
      id: `s_${generateUuid()}`,
      a: targetCoordIndex === 0 ? [start as any, src.a[1]] : [src.a[0], start as any],
      b: targetCoordIndex === 0 ? [end as any, src.b[1]] : [src.b[0], end as any],
    }),
    targetCoordIndex,
    tableInfo,
    lines,
    coordsList,
    duplicatedLineIdByOldId,
  );
  duplicatedStyles.forEach((s) => {
    patch[s.id] = s;
  });
  const duplicatedMerges = getPatchInfoByDuplicateLineMerges(
    (src, start, end) => ({
      ...src,
      id: `m_${generateUuid()}`,
      a: targetCoordIndex === 0 ? [start as any, src.a[1]] : [src.a[0], start as any],
      b: targetCoordIndex === 0 ? [end as any, src.b[1]] : [src.b[0], end as any],
    }),
    targetCoordIndex,
    tableInfo,
    lines,
    coordsList,
    duplicatedLineIdByOldId,
  );
  duplicatedMerges.forEach((s) => {
    patch[s.id] = s;
  });

  return {
    patch: {
      add: duplicatedShapes.length > 0 ? duplicatedShapes : undefined,
      update: { [table.id]: patch },
    },
    docMap: duplicatedShapeInfo.docMap,
  };
}

function getPatchInfoByDuplicateLineStyles<T extends TableRow | TableColumn>(
  generateStyle: (src: TableCellStyle, start: string, end: string) => TableCellStyle,
  targetCoordIndex: 0 | 1,
  tableInfo: TableShapeInfo,
  lines: TableRow[] | TableColumn[],
  coordsList: GetLineKey<T>[],
  duplicatedLineIdByOldId: Map<string, string>,
): TableCellStyle[] {
  const lineIndexMapById = new Map(lines.map((l, i) => [l.id, i]));
  const lineIndexList = coordsList.map<[number, string]>((c) => [lineIndexMapById.get(c)!, c]);
  const grouped = splitIntoRangeGroups(lineIndexList.map((v) => [v, v[0]]));
  const duplicated: TableCellStyle[] = [];
  grouped.forEach((group) => {
    if (group.length === 0) return;
    const items = group.toSorted((a, b) => a[0][0] - b[0][0]);

    const head = items[0];
    const tail = items[items.length - 1];
    tableInfo.styleAreas.forEach((sa, i) => {
      if (sa[1][targetCoordIndex] < head[0][0]) return;
      if (tail[0][0] < sa[0][targetCoordIndex]) return;

      const style = tableInfo.styles[i];
      const padding = sa[0][targetCoordIndex] - head[0][0];
      const a =
        padding < 0 ? duplicatedLineIdByOldId.get(head[0][1])! : duplicatedLineIdByOldId.get(items[padding][0][1])!;

      let b: string;
      const saRange = sa[1][targetCoordIndex] - sa[0][targetCoordIndex];
      if (padding + saRange < items.length) {
        b = duplicatedLineIdByOldId.get(items[padding + saRange][0][1])!;
      } else {
        b = duplicatedLineIdByOldId.get(tail[0][1])!;
      }
      duplicated.push(generateStyle(style, a, b));
    });
  });
  return duplicated;
}

function getPatchInfoByDuplicateLineMerges<T extends TableRow | TableColumn>(
  generateMerge: (src: TableCellMerge, start: string, end: string) => TableCellMerge,
  targetCoordIndex: 0 | 1,
  tableInfo: TableShapeInfo,
  lines: TableRow[] | TableColumn[],
  coordsList: GetLineKey<T>[],
  duplicatedLineIdByOldId: Map<string, string>,
): TableCellMerge[] {
  const lineIndexMapById = new Map(lines.map((l, i) => [l.id, i]));
  const lineIndexList = coordsList.map<[number, string]>((c) => [lineIndexMapById.get(c)!, c]);
  const grouped = splitIntoRangeGroups(lineIndexList.map((v) => [v, v[0]]));
  const duplicated: TableCellMerge[] = [];
  grouped.forEach((group) => {
    if (group.length === 0) return;
    const items = group.toSorted((a, b) => a[0][0] - b[0][0]);

    const head = items[0];
    const tail = items[items.length - 1];
    tableInfo.mergeAreas.forEach((ma, i) => {
      // Can be duplicated only when the merge area is encompassed by the duplication
      if (ma.area[0][targetCoordIndex] < head[0][0]) return;
      if (tail[0][0] < ma.area[1][targetCoordIndex]) return;

      const merge = tableInfo.merges[i];
      const padding = head[0][0] - ma.area[0][targetCoordIndex];
      const a = duplicatedLineIdByOldId.get(items[padding][0][1])!;

      const maRange = ma.area[1][targetCoordIndex] - ma.area[0][targetCoordIndex];
      const b = duplicatedLineIdByOldId.get(items[padding + maRange][0][1])!;
      duplicated.push(generateMerge(merge, a, b));
    });
  });
  return duplicated;
}
