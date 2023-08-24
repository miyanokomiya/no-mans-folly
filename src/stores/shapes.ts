import * as Y from "yjs";
import { Shape } from "../models";
import { newEntityStore } from "./core/entities";
import { newEntitySelectable } from "./core/entitySelectable";

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

  return {
    ...entityStore,

    watchSelected: shapeSelectable.watchSelected,
    getSelected: shapeSelectable.getSelected,
    getLastSelected: shapeSelectable.getLastSelected,
    select: shapeSelectable.select,
    multiSelect: shapeSelectable.multiSelect,
    selectAll: shapeSelectable.selectAll,
    clearAllSelected: shapeSelectable.clearAllSelected,
  };
}
