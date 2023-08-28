import * as Y from "yjs";
import type { Entity } from "../../models";
import { newCallback } from "../../composables/reactives";
import { toMap } from "../../utils/commons";

type Option = {
  name: string;
  ydoc: Y.Doc;
};

export function newEntityStore<T extends Entity>(option: Option) {
  const entityMap: Y.Map<Y.Map<any>> = option.ydoc.getMap(option.name);

  function getEntities(): T[] {
    return Array.from(entityMap.values()).map((ye) => toEntity(ye));
  }

  function getEntityMap(): { [id: string]: T } {
    return toMap(getEntities());
  }

  function getEntity(id: string): T | undefined {
    const ye = entityMap.get(id);
    return ye ? toEntity(ye) : undefined;
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
    entityMap.set(entity.id, toYEntity(entity));
  }

  function addEntities(entities: T[]) {
    transact(() => {
      entities.forEach((entity) => addEntity(entity));
    });
  }

  function deleteEntities(ids: string[]) {
    transact(() => {
      ids.forEach((id) => {
        entityMap.delete(id);
      });
    });
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

  function transact(fn: () => void) {
    option.ydoc.transact(fn);
  }

  const callback = newCallback();
  const watch = callback.bind;
  entityMap.observeDeep(callback.dispatch);

  function getScope(): Y.AbstractType<any> {
    return entityMap;
  }

  return {
    getEntities,
    getEntityMap,
    getEntity,
    addEntity,
    addEntities,
    deleteEntities,
    patchEntity,
    patchEntities,
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

  return {
    getEntity,
    patchEntity,
    transact,
    watch,
    getScope,
  };
}
