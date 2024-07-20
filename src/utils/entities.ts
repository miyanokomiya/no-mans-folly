import { Entity, EntityPatchInfo } from "../models";
import { mapFilter } from "./commons";

/**
 * Prioritizes "delete" the most.
 * Merges "update" to "add" when both exist.
 */
export function normalizeEntityPatchInfo<T extends Entity>(src: EntityPatchInfo<T>): EntityPatchInfo<T> {
  const ret: EntityPatchInfo<T> = { delete: src.delete };
  const deletedIds = new Set(src.delete ?? []);

  ret.add = src.add
    ?.filter((s) => !deletedIds.has(s.id))
    .map((s) => {
      const patch = src.update?.[s.id];
      return patch ? { ...s, ...patch } : s;
    });

  const addedIds = new Set(ret.add?.map((s) => s.id) ?? []);
  ret.update = src.update ? mapFilter(src.update, (_, id) => !addedIds.has(id) && !deletedIds.has(id)) : undefined;

  return ret;
}
