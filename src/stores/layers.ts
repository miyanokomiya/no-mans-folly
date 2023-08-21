import * as Y from "yjs";
import { Layer } from "../models";
import { newEntityStore } from "./core/entities";

type Option = {
  ydoc: Y.Doc;
};

export function newLayerStore(option: Option) {
  const entityStore = newEntityStore<Layer>({
    name: "layer_store",
    ydoc: option.ydoc,
  });

  return {
    ...entityStore,
  };
}
