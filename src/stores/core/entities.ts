import * as Y from "yjs";
import { Entity } from "../../models";

type Option = {
  name: string;
  ydoc: Y.Doc;
};

export function newEntityStore<T extends Entity>(option: Option) {
  const entityMap: Y.Map<Y.Map<any>> = option.ydoc.getMap(option.name);

  function getEntities(): T[] {
    return Array.from(entityMap.values()).map((ye) => toEntity(ye));
  }

  function toYEntity(entity: T): Y.Map<any> {
    const yEntity = new Y.Map<T>(Object.entries(entity));
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

  function removeEntity(entityId: string) {
    entityMap.delete(entityId);
  }

  function patchEntity(entityId: string, attrs: Partial<T>) {
    const yEntity: Y.Map<any> | undefined = entityMap.get(entityId);
    if (!yEntity) {
      return;
    }

    Object.entries(attrs).forEach(([key, value]) => {
      yEntity.set(key, value);
    });
  }

  function transact(fn: () => void) {
    option.ydoc.transact(fn);
  }

  let watchFns: Array<() => void> = [];
  function watch(fn: () => void): () => void {
    watchFns.push(fn);
    return () => {
      watchFns = watchFns.filter((f) => f !== fn);
    };
  }
  entityMap.observeDeep(() => {
    watchFns.forEach((f) => f());
  });

  function getScope(): Y.AbstractType<any> {
    return entityMap;
  }

  return {
    getEntities,
    addEntity,
    removeEntity,
    patchEntity,
    transact,
    watch,
    getScope,
  };
}
