import { Entity, EntityPatchInfo } from "../models";
import { isObjectEmpty, mapFilter, mergeMap } from "./commons";

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

/**
 * Prioritizes "add" of "override".
 * Merges "update" of "override" to "src" in property level.
 *
 * This method doen't call "normalizeEntityPatchInfo".
 */
export function mergeEntityPatchInfo<T extends Entity>(
  src: EntityPatchInfo<T>,
  overwrite: EntityPatchInfo<T>,
): EntityPatchInfo<T> {
  const ret: EntityPatchInfo<T> = { delete: src.delete };

  const addMap = new Map(src.add?.map((s) => [s.id, s]) ?? []);
  overwrite.add?.forEach((s) => {
    addMap.set(s.id, s);
  });
  if (addMap.size > 0) {
    ret.add = Array.from(addMap.values());
  }

  const update = mergeMap(src.update ?? {}, overwrite.update ?? {});
  if (!isObjectEmpty(update, true)) {
    ret.update = update;
  }

  const deleteSet = new Set(src.delete ?? []);
  overwrite.delete?.forEach((id) => {
    deleteSet.add(id);
  });
  if (deleteSet.size > 0) {
    ret.delete = Array.from(deleteSet.keys());
  }

  return ret;
}

export function patchByPartialProperties<T extends Entity>(
  src: T,
  partial: Partial<{ [key in keyof T]: Partial<T[key]> }>,
): Partial<T> {
  const ret: Partial<T> = {};
  for (const key in partial) {
    if (!(key in src)) continue;

    if (typeof partial[key] === "object" && partial[key] !== null) {
      if (!isObjectEmpty(partial[key])) {
        (ret as any)[key] = { ...(src as any)[key], ...(partial[key] as any) };
      }
    } else {
      ret[key] = partial[key] as any;
    }
  }
  return ret;
}
