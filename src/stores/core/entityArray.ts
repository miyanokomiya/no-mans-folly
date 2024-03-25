import * as Y from "yjs";
import { generateKeyBetween } from "fractional-indexing";
import type { Entity } from "../../models";
import { newCallback } from "../../composables/reactives";
import { findexSortFn, toMap } from "../../utils/commons";
import { newCache } from "../../composables/cache";

type Option = {
  name: string;
  ydoc: Y.Doc;
};

export function newEntityStore<T extends Entity>(option: Option) {
  let ydoc: Y.Doc;
  let entityArray: Y.Array<Y.Map<any>>;
  let unobserve: (() => void) | undefined;

  const callback = newCallback<Set<string>>();
  const watch = callback.bind;

  let reverselookupTable: string[];

  const _entitiesCache = newCache(() => {
    const list = entityArray.toArray().map((ye) => toEntity(ye));
    const lookupTable = new Map(list.map((entity, i) => [entity.id, i]));
    reverselookupTable = list.map((entity) => entity.id);

    list.sort(findexSortFn);
    return [list, lookupTable] as const;
  });

  function observeEntityArray(entityArray: Y.Array<any>, fn: (ids: Set<string>) => void): () => void {
    const callback = (arg: Array<Y.YEvent<any>>) => {
      const ids = new Set<string>();

      arg.forEach((a) => {
        if (a.target === entityArray) {
          let index = 0;
          for (const k of a.changes.delta) {
            if (k.insert && Array.isArray(k.insert)) {
              index += k.insert.length;
              k.insert.forEach((item: any) => {
                ids.add(item.get("id"));
              });
            } else if (k.retain) {
              index += k.retain;
            } else if (k.delete) {
              for (let i = 0; i < k.delete; i++) {
                if (reverselookupTable) {
                  const id = reverselookupTable[index + i];
                  if (id) {
                    ids.add(id);
                  }
                }
              }
              index += k.delete;
            }
          }
        } else {
          for (const index of a.path as number[]) {
            const id = entityArray.get(index)?.get("id");
            if (id) {
              ids.add(id);
            }
          }
        }
      });
      fn(ids);
    };
    entityArray.observeDeep(callback);
    return () => {
      entityArray.unobserveDeep(callback);
    };
  }

  function refresh(_ydoc: Y.Doc) {
    unobserve?.();
    unobserve = undefined;

    ydoc = _ydoc;
    entityArray = ydoc.getArray(`${option.name}_array`);
    unobserve = observeEntityArray(entityArray, (ids: Set<string>) => {
      _entitiesCache.update();
      callback.dispatch(ids);
    });
    _entitiesCache.update();
    callback.dispatch(new Set(getEntities().map((e) => e.id)));
  }
  refresh(option.ydoc);

  let disposed = false;
  function dispose() {
    if (disposed) return;

    unobserve?.();
    unobserve = undefined;
    disposed = true;
  }

  function getEntities(): T[] {
    return _entitiesCache.getValue()[0];
  }

  function getIndexFromId(id: string): number | undefined {
    return _entitiesCache.getValue()[1].get(id);
  }

  function getEntityMap(): { [id: string]: T } {
    return toMap(getEntities());
  }

  function getEntity(id: string): T | undefined {
    const entities = getEntities();
    const index = getIndexFromId(id);
    return index !== undefined ? entities[index] : undefined;
  }

  function toYEntity(entity: T): Y.Map<any> {
    const yEntity = new Y.Map<any>(Object.entries(entity));
    return yEntity;
  }

  function toEntity(yEntity: Y.Map<any>): T {
    const ret: any = {};
    for (const [key, value] of yEntity.entries()) {
      ret[key] = value;
    }
    return ret;
  }

  function addEntity(entity: T) {
    if (!entity.id) throw new Error("Entity must have id");

    if (entity.findex) {
      entityArray.push([toYEntity(entity)]);
    } else {
      entityArray.push([toYEntity({ ...entity, findex: createLastIndex() })]);
    }
  }

  function addEntities(entities: T[]) {
    let lastIndex = createLastIndex();
    transact(() => {
      entities.forEach((entity) => {
        if (entity.findex) {
          addEntity(entity);
        } else {
          addEntity({ ...entity, findex: lastIndex });
          lastIndex = generateKeyBetween(lastIndex, null);
        }
      });
    });
  }

  function deleteEntities(ids: string[], noTransact = false) {
    const idSet = new Set(ids);

    const proc = () => {
      let deletedCount = 0;
      entityArray.forEach((entity, index) => {
        if (idSet.has(entity.get("id"))) {
          entityArray.delete(index - deletedCount);
          deletedCount++;
        }
      });
    };

    if (noTransact) {
      proc();
    } else {
      transact(() => {
        proc();
      });
    }
  }

  function patchEntity(entityId: string, attrs: Partial<T>) {
    const index = getIndexFromId(entityId);
    if (index === undefined) return;

    const yEntity: Y.Map<any> | undefined = entityArray.get(index);
    if (!yEntity) return;

    Object.entries(attrs).forEach(([key, value]) => {
      if (value === undefined) {
        yEntity.delete(key);
      } else {
        yEntity.set(key, value);
      }
    });
  }

  function patchEntities(val: { [id: string]: Partial<T> }) {
    transact(() => {
      Object.entries(val).forEach(([id, attrs]) => {
        patchEntity(id, attrs);
      });
    });
  }

  function createFirstIndex(): string {
    const entries = getEntities().filter((s) => s.findex);
    return generateKeyBetween(null, entries[0]?.findex);
  }

  function createLastIndex(): string {
    const entries = getEntities().filter((s) => s.findex);
    return generateKeyBetween(entries[entries.length - 1]?.findex, null);
  }

  /**
   * Each entity can have up to one operation during the transaction.
   * => Because of cache structure of lookup table.
   * e.g. Add "a", then patch or delete "a" in the same transaction doesn't work.
   */
  function transact(fn: () => void) {
    ydoc.transact(fn);
  }

  function getScope(): Y.AbstractType<any> {
    return entityArray;
  }

  return {
    refresh,
    dispose,
    getEntities,
    getEntityMap,
    getEntity,
    addEntity,
    addEntities,
    deleteEntities,
    patchEntity,
    patchEntities,
    createFirstIndex,
    createLastIndex,
    transact,
    watch,
    getScope,
  };
}

export function newSingleEntityStore<T extends Entity>(option: Option) {
  const entity: Y.Map<any> = option.ydoc.getMap(option.name);

  function getEntity(): T {
    return toEntity(entity);
  }

  function toEntity(yEntity: Y.Map<any>): T {
    const ret: any = {};
    for (const [key, value] of yEntity.entries()) {
      ret[key] = value;
    }
    return ret;
  }

  function patchEntity(attrs: Partial<T>) {
    Object.entries(attrs).forEach(([key, value]) => {
      entity.set(key, value);
    });
  }

  function transact(fn: () => void) {
    option.ydoc.transact(fn);
  }

  const callback = newCallback();
  const watch = callback.bind;
  entity.observe(callback.dispatch);

  function getScope(): Y.AbstractType<any> {
    return entity;
  }

  let disposed = false;
  function dispose() {
    if (disposed) return;

    entity.unobserve(callback.dispatch);
    disposed = true;
  }

  return {
    getEntity,
    patchEntity,
    transact,
    watch,
    getScope,
    dispose,
  };
}
