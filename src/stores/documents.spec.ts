import { describe, expect, test } from "vitest";
import { newDocumentStore } from "./documents";
import * as Y from "yjs";

describe("newDocumentStore", () => {
  describe("getDocMap", () => {
    test("should return a key map of docs", () => {
      const ydoc = new Y.Doc();
      const store = newDocumentStore({ ydoc });
      store.addDoc("a", [{ insert: "a" }]);
      store.addDoc("b", [{ insert: "b" }]);
      expect(store.getDocMap()).toEqual({
        a: [{ insert: "a" }],
        b: [{ insert: "b" }],
      });
    });
  });

  describe("deleteDoc", () => {
    test("should delete the doc", () => {
      const ydoc = new Y.Doc();
      const store = newDocumentStore({ ydoc });
      store.addDoc("a", [{ insert: "a" }]);
      store.deleteDoc("a");
      expect(store.getDocMap()).toEqual({});
    });
  });

  describe("patchDoc", () => {
    test("should patch the doc", () => {
      const ydoc = new Y.Doc();
      const store = newDocumentStore({ ydoc });
      store.addDoc("a", [{ insert: "a" }]);
      store.patchDoc("a", [{ retain: 1 }, { insert: "b" }]);
      expect(store.getDocMap()).toEqual({
        a: [{ insert: "ab" }],
      });
    });

    test("should create the doc if it doesn't exist", () => {
      const ydoc = new Y.Doc();
      const store = newDocumentStore({ ydoc });
      store.patchDoc("a", [{ insert: "a" }]);
      expect(store.getDocMap()).toEqual({
        a: [{ insert: "a" }],
      });
    });
  });
});
