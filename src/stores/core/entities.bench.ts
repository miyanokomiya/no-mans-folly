import { describe, bench } from "vitest";
import * as Y from "yjs";
import { newEntityStore } from "./entities";

describe("newEntityStore", () => {
  describe("patchEntities", () => {
    const ydoc = new Y.Doc();
    const store = newEntityStore({ name: "test", ydoc });

    const ids = [...Array(500)].map((_, i) => `id_${i}`);
    ids.map((id) => {
      store.addEntity({ id, findex: `findex_${id}` });
    });

    bench("patch all entities in order", () => {
      ids.map((id) => {
        store.patchEntities({ [id]: { findex: id } });
      });
      store.getEntities();
    });
  });
});
