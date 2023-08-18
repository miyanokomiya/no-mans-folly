import * as Y from "yjs";
import { Entity } from "../models";

export function newShapeStore(ydoc: Y.Doc) {
  const entityMap: Y.Map<Y.Map<any>> = ydoc.getMap("shape_entity_map");

  function getEntities(): Entity[] {
    return Array.from(entityMap.values()).map((ye) => toEntity(ye));
  }

  function toYEntity(entity: Entity): Y.Map<any> {
    const yEntity = new Y.Map<Entity>(Object.entries(entity));
    return yEntity;
  }

  function toEntity(yEntity: Y.Map<any>): Entity {
    const ret: any = {};
    for (const [key, value] of yEntity.entries()) {
      ret[key] = value;
    }
    return ret;
  }

  function addEntity(entity: Entity) {
    entityMap.set(entity.id, toYEntity(entity));
  }

  function removeEntity(entityId: string) {
    entityMap.delete(entityId);
  }

  function patchEntity(entityId: string, attrs: Partial<Entity>) {
    const yEntity: Y.Map<any> | undefined = entityMap.get(entityId);
    if (!yEntity) {
      return;
    }

    Object.entries(attrs).forEach(([key, value]) => {
      yEntity.set(key, value);
    });
  }

  return {
    getEntities,
    addEntity,
    removeEntity,
    patchEntity,
  };
}
