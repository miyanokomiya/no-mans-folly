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

  return {
    ...signleEntityStore,
  };
}
export type DiagramStore = ReturnType<typeof newDiagramStore>;
