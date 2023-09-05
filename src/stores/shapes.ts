import * as Y from "yjs";
import { Shape } from "../models";
import { newEntityStore } from "./core/entities";
import { newEntitySelectable } from "./core/entitySelectable";
import { newCallback } from "../composables/reactives";

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
    tmpShapeMapCallback.dispatch();
  }

  function getTmpShapeMap(): { [id: string]: Partial<Shape> } {
    return tmpShapeMap;
  }

  const tmpShapeMapCallback = newCallback();

  function refresh(_ydoc: Y.Doc) {
    shapeSelectable.clearAllSelected();
    setTmpShapeMap({});
    entityStore.refresh(_ydoc);
  }

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
  };
}
