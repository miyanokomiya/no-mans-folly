import * as Y from "yjs";
import { Layer } from "../models";
import { newEntityStore } from "./core/entities";
import { newValueStore } from "./core/values";

type Option = {
  ydoc: Y.Doc;
};

export function newLayerStore(option: Option) {
  const entityStore = newEntityStore<Layer>({
    name: "layer_store",
    ydoc: option.ydoc,
  });

  const selectedIdStore = newValueStore(entityStore.getEntities()[0]?.id ?? "");
  function getSelectedLayer(): Layer | undefined {
    return entityStore.getEntity(selectedIdStore.getValue());
  }
  function selectLayer(id: string) {
    selectedIdStore.setValue(id);
  }
  const watchSelected = selectedIdStore.watch;

  function refresh(_ydoc: Y.Doc) {
    entityStore.refresh(_ydoc);
  }

  return {
    ...entityStore,
    refresh,
    getSelectedLayer,
    selectLayer,
    watchSelected,
  };
}
