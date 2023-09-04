import * as Y from "yjs";
import { Sheet } from "../models";
import { newEntityStore } from "./core/entities";
import { newValueStore } from "./core/values";

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
    return entityStore.getEntity(selectedIdStore.getValue());
  }
  function selectSheet(id: string) {
    selectedIdStore.setValue(id);
  }
  const watchSelected = selectedIdStore.watch;

  return {
    ...entityStore,
    getSelectedSheet,
    selectSheet,
    watchSelected,
  };
}
