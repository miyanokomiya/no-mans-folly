import * as Y from "yjs";
import { Shape } from "../models";
import { newEntityStore } from "./core/entities";
import { newEntitySelectable } from "./core/entitySelectable";
import { newCallback } from "../utils/stateful/reactives";
import { newShapeComposite, replaceTmpShapeMapOfShapeComposite, ShapeComposite } from "../composables/shapeComposite";
import { newCache } from "../utils/stateful/cache";
import { getCommonStruct } from "../shapes";

type Option = {
  ydoc: Y.Doc;
};

export function newShapeStore(option: Option) {
  const entityStore = newEntityStore<Shape>({
    name: "shape_store",
    ydoc: option.ydoc,
  });

  const shapeSelectable = newEntitySelectable({
    getEntityMap: entityStore.getEntityMap,
    watchEntities: entityStore.watch,
  });

  let tmpShapeMap: { [id: string]: Partial<Shape> } = {};

  function setTmpShapeMap(val: { [id: string]: Partial<Shape> }) {
    tmpShapeMap = val;
    tmpShapeMapCallback.dispatch(new Set(Object.keys(val)));
  }

  function getTmpShapeMap(): { [id: string]: Partial<Shape> } {
    return tmpShapeMap;
  }

  const tmpShapeMapCallback = newCallback<Set<string>>();

  function refresh(_ydoc: Y.Doc) {
    shapeSelectable.clearAllSelected();
    setTmpShapeMap({});
    entityStore.refresh(_ydoc);
  }

  let shapeUpdated = true;
  let shapeCompositeRawCache: ShapeComposite | undefined;
  const shapeCompositeCache = newCache(() => {
    const shapes = entityStore.getEntities();
    if (!shapeUpdated && shapeCompositeRawCache) {
      shapeCompositeRawCache = replaceTmpShapeMapOfShapeComposite(shapeCompositeRawCache, tmpShapeMap);
    } else {
      shapeCompositeRawCache = newShapeComposite({ shapes, tmpShapeMap, getStruct: getCommonStruct });
    }

    shapeUpdated = false;
    return shapeCompositeRawCache;
  });
  entityStore.watch(() => {
    shapeUpdated = true;
    shapeCompositeCache.update();
  });
  tmpShapeMapCallback.bind(shapeCompositeCache.update);

  const staticShapeCompositeCache = newCache(() => {
    return newShapeComposite({ shapes: entityStore.getEntities(), getStruct: getCommonStruct });
  });
  entityStore.watch(staticShapeCompositeCache.update);

  return {
    ...entityStore,
    refresh,

    watchSelected: shapeSelectable.watchSelected,
    getSelected: shapeSelectable.getSelected,
    getLastSelected: shapeSelectable.getLastSelected,
    select: shapeSelectable.select,
    multiSelect: shapeSelectable.multiSelect,
    selectAll: shapeSelectable.selectAll,
    clearAllSelected: shapeSelectable.clearAllSelected,

    setTmpShapeMap,
    getTmpShapeMap,
    watchTmpShapeMap: tmpShapeMapCallback.bind,

    /**
     * This property should be used most of the time shapes are needed, because shape composite may format them for variety of reasons.
     * "getEntities", "getEntityMap" and "getEntity" should be used only when raw persistent data is needed.
     */
    get shapeComposite() {
      return shapeCompositeCache.getValue();
    },
    get staticShapeComposite() {
      return staticShapeCompositeCache.getValue();
    },
  };
}
export type ShapeStore = ReturnType<typeof newShapeStore>;
