import * as Y from "yjs";
import { Shape } from "../models";
import { newEntityStore } from "./core/entities";
import { newEntitySelectable } from "./core/entitySelectable";
import { newCallback } from "../composables/reactives";
import { newShapeComposite } from "../composables/shapeComposite";
import { newCache } from "../composables/cache";
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

  const shapeCompositeCache = newCache(() => {
    return newShapeComposite({ shapes: entityStore.getEntities(), tmpShapeMap, getStruct: getCommonStruct });
  });
  entityStore.watch(shapeCompositeCache.update);
  tmpShapeMapCallback.bind(shapeCompositeCache.update);

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

    get shapeComposite() {
      return shapeCompositeCache.getValue();
    },
  };
}
export type ShapeStore = ReturnType<typeof newShapeStore>;
