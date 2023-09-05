import { expect, describe, test } from "vitest";
import * as Y from "yjs";
import { newSheetStore } from "./sheets";

describe("newSheetStore", () => {
  test("should select the first item if something wrong", () => {
    const ydoc = new Y.Doc();
    const store = newSheetStore({ ydoc });
    expect(store.getSelectedSheet()?.id).toBe(undefined);
    store.addEntity({ id: "a", findex: "0", name: "a" });
    expect(store.getSelectedSheet()?.id).toBe("a");
    store.addEntity({ id: "b", findex: "1", name: "b" });
    expect(store.getSelectedSheet()?.id).toBe("a");
    store.selectSheet("c");
    expect(store.getSelectedSheet()?.id).toBe("a");
    store.selectSheet("b");
    expect(store.getSelectedSheet()?.id).toBe("b");
    store.deleteEntities(["b"]);
    expect(store.getSelectedSheet()?.id).toBe("a");
    store.deleteEntities(["a"]);
    expect(store.getSelectedSheet()?.id).toBe(undefined);
  });
});
