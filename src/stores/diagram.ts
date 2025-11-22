import * as Y from "yjs";
import type { Diagram } from "../models";
import { newSingleEntityStore } from "./core/entities";

type Option = {
  ydoc: Y.Doc;
};

export function newDiagramStore(option: Option) {
  const singleEntityStore = newSingleEntityStore<Diagram>({
    name: "diagram_store",
    ydoc: option.ydoc,
  });

  // Set ID to meta here for backward compatibility
  option.ydoc.meta ??= {};
  option.ydoc.meta.diagramId = singleEntityStore.getEntity().id;

  return {
    ydoc: option.ydoc,
    ...singleEntityStore,
    patchEntity(attrs: Partial<Diagram>) {
      if (attrs.id) {
        option.ydoc.meta.diagramId = attrs.id;
      }
      return singleEntityStore.patchEntity(attrs);
    },
  };
}
export type DiagramStore = ReturnType<typeof newDiagramStore>;
