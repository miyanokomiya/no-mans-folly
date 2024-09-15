import * as Y from "yjs";
import { generateKeyBetween } from "fractional-indexing";
import type { Entity } from "../../models";
import { newCallback } from "../../utils/stateful/reactives";
import { findexSortFn, toMap } from "../../utils/commons";

type Option = {
  name: string;
  ydoc: Y.Doc;
};

export function newEntityStore<T extends Entity>(option: Option) {
  let ydoc: Y.Doc;
  let entityMap: Y.Map<Y.Map<any>>;
  let unobserve: (() => void) | undefined;
  let entityListCache: ReturnType<typeof newEntityListCache<T>>;

  const callback = newCallback<Set<string>>();
  const watch = callback.bind;

  function refresh(_ydoc: Y.Doc) {
    unobserve?.();
    unobserve = undefined;

    ydoc = _ydoc;
    entityMap = ydoc.getMap(option.name);
    unobserve = observeEntityMap(entityMap, (ids, keyMap) => {
      entityListCache.setDirtyKeyMap(keyMap);
      callback.dispatch(ids);
    });
    entityListCache = newEntityListCache(entityMap);
    entityListCache.refresh();
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
    return entityListCache.getEntityList();
  }

  function getEntityMap(): { [id: string]: T } {
    return toMap(getEntities());
  }

  function getEntity(id: string): T | undefined {
    const ye = entityMap.get(id);
    return ye ? toEntity<T>(ye) : undefined;
  }

  function addEntity(entity: T) {
    if (!entity.id) throw new Error("Entity must have id");

    if (entity.findex) {
      entityMap.set(entity.id, toYEntity(entity));
    } else {
      entityMap.set(entity.id, toYEntity({ ...entity, findex: createLastIndex() }));
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
    if (noTransact) {
      ids.forEach((id) => {
        entityMap.delete(id);
      });
    } else {
      transact(() => {
        ids.forEach((id) => {
          entityMap.delete(id);
        });
      });
    }
  }

  function patchEntity(entityId: string, attrs: Partial<T>) {
    const yEntity: Y.Map<any> | undefined = entityMap.get(entityId);
    if (!yEntity) {
      return;
    }

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

  function transact(fn: () => void) {
    ydoc.transact(fn);
  }

  function getScope(): Y.AbstractType<any> {
    return entityMap;
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
    return toEntity<T>(entity);
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

type ObserveValue = { action: "add" | "update" | "delete" };
type ObserveKeyMap = Map<string, ObserveValue>;

export function observeEntityMap(
  entityMap: Y.Map<any>,
  fn: (ids: Set<string>, keyMap: ObserveKeyMap) => void,
): () => void {
  const callback = (arg: Array<Y.YEvent<any>>) => {
    const ids = new Set<string>();
    const keyMap: ObserveKeyMap = new Map();
    arg.forEach((a) => {
      if (a.target === entityMap) {
        for (const [key, v] of a.keys) {
          keyMap.set(key, { action: v.action });
        }
        for (const k of a.keys.keys()) {
          ids.add(k);
        }
      } else {
        const id = a.path[a.path.length - 1] as string;
        ids.add(id);
        keyMap.set(id, { action: "update" });
      }
    });
    fn(ids, keyMap);
  };
  entityMap.observeDeep(callback);
  return () => {
    entityMap.unobserveDeep(callback);
  };
}

function newEntityListCache<T extends Entity>(entityMap: Y.Map<Y.Map<any>>) {
  let entityListCache: T[] = [];
  let dirtyKeyMap: ObserveKeyMap = new Map();

  function refresh() {
    const list = Array.from(entityMap.values()).map((ye) => toEntity<T>(ye));
    list.sort(findexSortFn);
    entityListCache = list;
    dirtyKeyMap = new Map();
  }

  function patchEntityListCache() {
    if (dirtyKeyMap.size === 0) return;

    const indexMap = new Map<string, number>();
    let shift = 0;
    entityListCache.forEach((entity, i) => {
      const v = dirtyKeyMap!.get(entity.id);
      if (!v) return;

      indexMap.set(entity.id, i + shift);
      if (v.action === "delete") {
        shift--;
      }
    });

    entityListCache = entityListCache.concat();
    for (const [id, v] of dirtyKeyMap) {
      switch (v.action) {
        case "add":
        case "update":
          if (indexMap.has(id)) {
            entityListCache[indexMap.get(id)!] = toEntity(entityMap.get(id)!);
          } else {
            entityListCache.push(toEntity(entityMap.get(id)!));
          }
          break;
        case "delete":
          if (indexMap.has(id)) {
            entityListCache.splice(indexMap.get(id)!, 1);
          }
          break;
      }
    }

    entityListCache.sort(findexSortFn);
    dirtyKeyMap = new Map();
  }

  function getEntityList(): T[] {
    patchEntityListCache();
    return entityListCache;
  }

  function setDirtyKeyMap(keyMap: ObserveKeyMap) {
    for (const [key, v] of keyMap) {
      dirtyKeyMap.set(key, v);
    }
  }

  return { refresh, getEntityList, setDirtyKeyMap };
}

function toEntity<T extends Entity>(yEntity: Y.Map<any>): T {
  const ret: any = {};
  for (const [key, value] of yEntity.entries()) {
    ret[key] = value;
  }
  return ret;
}

function toYEntity<T extends Entity>(entity: T): Y.Map<any> {
  const yEntity = new Y.Map<any>(Object.entries(entity));
  return yEntity;
}
