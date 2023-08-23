import * as Y from "yjs";
import * as okaselect from "okaselect";
import { Shape } from "../models";
import { newEntityStore } from "./core/entities";
import { newCallback } from "../composables/reactives";

type Option = {
  ydoc: Y.Doc;
};

export function newShapeStore(option: Option) {
  const entityStore = newEntityStore<Shape>({
    name: "shape_store",
    ydoc: option.ydoc,
  });

  const selectedCallback = newCallback();
  const shapeSelectable = okaselect.useItemSelectable(entityStore.getEntityMap, {
    onUpdated: selectedCallback.dispatch,
  });

  return {
    ...entityStore,

    watchSelected: selectedCallback.bind,
    selectIdMap: shapeSelectable.getSelected,
    select: shapeSelectable.select,
    multiSelect: shapeSelectable.multiSelect,
    selectAll: shapeSelectable.selectAll,
    clearAllSelected: shapeSelectable.clearAll,
  };
}
