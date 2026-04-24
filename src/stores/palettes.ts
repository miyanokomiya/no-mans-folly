import * as Y from "yjs";
import { Palette, PaletteColors } from "../models";
import { newEntityStore } from "./core/entities";
import { newValueStore } from "./core/values";
import { newCallback } from "../utils/stateful/reactives";

type Option = {
  ydoc: Y.Doc;
};

export function newPaletteStore(option: Option) {
  const entityStore = newEntityStore<Palette>({
    name: "palette_store",
    ydoc: option.ydoc,
  });

  const selectedIdStore = newValueStore(entityStore.getEntities().at(0)?.id ?? "");
  function getSelectedPalette(): Palette | undefined {
    return entityStore.getEntity(selectedIdStore.getValue()) ?? entityStore.getEntities()[0];
  }
  function selectPalette(id: string) {
    if (entityStore.getEntityMap()[id]) {
      selectedIdStore.setValue(id);
    }
  }

  entityStore.watch(() => {
    if (!entityStore.getEntity(selectedIdStore.getValue())) {
      selectedIdStore.setValue(entityStore.getEntities().at(0)?.id ?? "");
    }
  });

  let tmpPaletteMap: { [id: string]: Partial<Palette> } = {};

  function setTmpPaletteMap(val: { [id: string]: Partial<Palette> }) {
    tmpPaletteMap = val;
    tmpPaletteMapCallback.dispatch();
  }

  function getTmpPaletteMap(): { [id: string]: Partial<Palette> } {
    return tmpPaletteMap;
  }

  const tmpPaletteMapCallback = newCallback();

  function refresh(_ydoc: Y.Doc) {
    selectedIdStore.setValue("");
    setTmpPaletteMap({});
    entityStore.refresh(_ydoc);
  }

  return {
    ...entityStore,
    refresh,
    getSelectedPalette,
    selectPalette,
    watchSelected: selectedIdStore.watch,

    setTmpPaletteMap,
    getTmpPaletteMap,
    watchTmpPaletteMap: tmpPaletteMapCallback.bind,
  };
}
export type PaletteStore = ReturnType<typeof newPaletteStore>;
