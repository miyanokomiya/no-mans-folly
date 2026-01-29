import { EntityPatchInfo, Shape } from "../../models";
import { DocOutput } from "../../models/document";
import {
  getTableShapeInfo,
  parseTableMeta,
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

  return getPatchInfoByDuplicateLines(
    shapeComposite,
    docs,
    generateUuid,
    () => `r_${generateUuid()}`,
    (coords) => ({ target: coords[0], other: coords[1] }),
    (target, other) => generateTableMeta([target, other] as TableCoords),
    table,
    tableInfo,
    tableInfo.rows,
    coordsList,
  );
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

  return getPatchInfoByDuplicateLines(
    shapeComposite,
    docs,
    generateUuid,
    () => `c_${generateUuid()}`,
    (coords) => ({ target: coords[1], other: coords[0] }),
    (target, other) => generateTableMeta([other, target] as TableCoords),
    table,
    tableInfo,
    tableInfo.columns,
    coordsList,
  );
}

type GetLineKey<T> = T extends TableRow ? TableRowKey : TableColumnKey;
type GetOtherLineKye<T> = T extends TableRow ? TableColumnKey : TableRowKey;
type GetLineList<T> = T extends TableRow ? TableRow[] : TableColumn[];

/**
 * "coordList" represent the lines for the duplication.
 * Duplicated lines will inherit the order of "coordList".
 * Duplicated lines will be inserted after the last line of the targets.
 */
function getPatchInfoByDuplicateLines<T extends TableRow | TableColumn>(
  shapeComposite: ShapeComposite,
  docs: [id: string, doc: DocOutput][],
  generateUuid: () => string,
  generateLineId: () => string,
  getCoordsInfo: (coords: TableCoords) => { target: GetLineKey<T>; other: GetOtherLineKye<T> },
  generateMeta: (target: string, other: string) => string,
  table: TableShape,
  tableInfo: TableShapeInfo,
  lines: GetLineList<T>,
  coordsList: GetLineKey<T>[],
) {
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

    const coordsInfo = getCoordsInfo(srcCoord);
    const duplicatedCoord = duplicatedLineIdByOldId.get(coordsInfo.target);
    if (!duplicatedCoord) return s;

    return { ...s, parentMeta: generateMeta(duplicatedCoord, coordsInfo.other) };
  });

  return {
    patch: {
      add: duplicatedShapes,
      update: { [table.id]: tablePatch },
    },
    docMap: duplicatedShapeInfo.docMap,
  };
}
