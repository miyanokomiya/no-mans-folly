import * as Y from "yjs";
import type { Diagram } from "../models";
import { newSingleEntityStore } from "./core/entities";

type Option = {
  ydoc: Y.Doc;
};

export function newDiagramStore(option: Option) {
  const signleEntityStore = newSingleEntityStore<Diagram>({
    name: "diagram_store",
    ydoc: option.ydoc,
  });

  // Set ID to meta here for backward compatibility
  option.ydoc.meta ??= {};
  option.ydoc.meta.diagramId = signleEntityStore.getEntity().id;

  return {
    ...signleEntityStore,
  };
}
export type DiagramStore = ReturnType<typeof newDiagramStore>;
