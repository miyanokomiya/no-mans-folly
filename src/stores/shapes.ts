import * as Y from "yjs";
import { Shape } from "../models";
import { newEntityStore } from "./core/entities";

type Option = {
  ydoc: Y.Doc;
};

export function newShapeStore(option: Option) {
  const entityStore = newEntityStore<Shape>({
    name: "shape_store",
    ydoc: option.ydoc,
  });

  return {
    ...entityStore,
  };
}
