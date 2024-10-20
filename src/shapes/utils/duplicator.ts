import { AffineMatrix, IRectangle, IVec2, sub } from "okageo";
import * as geometry from "../../utils/geometry";
import { Shape } from "../../models";
import { DocOutput } from "../../models/document";
import { GetShapeStruct } from "../core";
import { patchShapesOrderToLast, refreshShapeRelations, remapShapeIds, resizeShape } from "..";
import { mapDataToObj, remap } from "../../utils/commons";
import { newShapeComposite } from "../../composables/shapeComposite";

/**
 * When `keepExternalRelations` is true, all relations except for ids of duplicating targets will be kept.
 * Make sure those relations are satisfied by `availableIdSet` as well.
 */
export function duplicateShapes(
  getStruct: GetShapeStruct,
  shapes: Shape[],
  docs: [id: string, doc: DocOutput][],
  generateUuid: () => string,
  lastFIndex: string,
  availableIdSet: Set<string>,
  p?: IVec2,
  keepExternalRelations = false,
): { shapes: Shape[]; docMap: { [id: string]: DocOutput } } {
  const remapInfo = remapShapeIds(getStruct, shapes, generateUuid, !keepExternalRelations);
  const remapDocs = remap(mapDataToObj(docs), remapInfo.newToOldMap);

  const remapComposite = newShapeComposite({
    shapes: remapInfo.shapes,
    getStruct,
  });
  const moved = p
    ? shiftShapesAtTopLeft(
        getStruct,
        remapInfo.shapes.map((s) => [s, remapComposite.getWrapperRect(s)]),
        p,
      )
    : remapInfo.shapes;
  const patch = patchShapesOrderToLast(
    moved.map((s) => s.id),
    lastFIndex,
  );

  let result: Shape[] = moved.map((s) => ({ ...s, ...patch[s.id] }));

  const nextAvailableIdSet = new Set(availableIdSet);
  result.forEach((s) => nextAvailableIdSet.add(s.id));

  const refreshed = refreshShapeRelations(getStruct, result, nextAvailableIdSet);
  result = result.map((s) => ({ ...s, ...(refreshed[s.id] ?? {}) }));

  return {
    shapes: result,
    docMap: remapDocs,
  };
}

function shiftShapesAtTopLeft(getStruct: GetShapeStruct, shapeInfos: [Shape, IRectangle][], targetP: IVec2): Shape[] {
  const rect = geometry.getWrapperRect(shapeInfos.map(([, r]) => r));
  const d = sub(targetP, rect);

  const affine: AffineMatrix = [1, 0, 0, 1, d.x, d.y];
  const moved = shapeInfos.map(([s]) => {
    const patch = resizeShape(getStruct, s, affine);
    return { ...s, ...patch };
  });

  return moved;
}
