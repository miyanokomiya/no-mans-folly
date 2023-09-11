import * as Y from "yjs";
import { Sheet } from "../models";
import { newEntityStore } from "./core/entities";
import { newValueStore } from "./core/values";
import { newCallback } from "../composables/reactives";

type Option = {
  ydoc: Y.Doc;
};

export function newSheetStore(option: Option) {
  const entityStore = newEntityStore<Sheet>({
    name: "sheet_store",
    ydoc: option.ydoc,
  });

  const selectedIdStore = newValueStore(entityStore.getEntities()[0]?.id ?? "");
  function getSelectedSheet(): Sheet | undefined {
    return entityStore.getEntity(selectedIdStore.getValue()) ?? entityStore.getEntities()[0];
  }
  function selectSheet(id: string) {
    if (entityStore.getEntityMap()[id]) {
      selectedIdStore.setValue(id);
    }
  }

  entityStore.watch(() => {
    if (!entityStore.getEntityMap()[selectedIdStore.getValue()]) {
      selectedIdStore.setValue(entityStore.getEntities()[0]?.id ?? "");
    }
  });

  let tmpSheetMap: { [id: string]: Partial<Sheet> } = {};

  function setTmpSheetMap(val: { [id: string]: Partial<Sheet> }) {
    tmpSheetMap = val;
    tmpSheetMapCallback.dispatch();
  }

  function getTmpSheetMap(): { [id: string]: Partial<Sheet> } {
    return tmpSheetMap;
  }

  const tmpSheetMapCallback = newCallback();

  function refresh(_ydoc: Y.Doc) {
    selectedIdStore.setValue("");
    setTmpSheetMap({});
    entityStore.refresh(_ydoc);
  }

  return {
    ...entityStore,
    refresh,
    getSelectedSheet,
    selectSheet,
    watchSelected: selectedIdStore.watch,

    setTmpSheetMap,
    getTmpSheetMap,
    watchTmpSheetMap: tmpSheetMapCallback.bind,
  };
}
