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

  describe("Delta format spec", () => {
    test("remain: should inherit current attributes", () => {
      const ydoc = new Y.Doc();
      const store = newDocumentStore({ ydoc });
      store.addDoc("a", [{ insert: "abc\n", attributes: { color: "#000000" } }]);
      store.patchDoc("a", [{ retain: 3 }, { retain: 1, attributes: { align: "right" } }]);
      expect(store.getDocMap()).toEqual({
        a: [
          { insert: "abc", attributes: { color: "#000000" } },
          { insert: "\n", attributes: { color: "#000000", align: "right" } },
        ],
      });
    });

    test("insert: should not inherit previous attributes", () => {
      const ydoc = new Y.Doc();
      const store = newDocumentStore({ ydoc });
      store.addDoc("a", [{ insert: "abc\n", attributes: { color: "#000000" } }]);
      store.patchDoc("a", [{ retain: 2 }, { insert: "\n" }]);
      expect(store.getDocMap()).toEqual({
        a: [
          { insert: "ab", attributes: { color: "#000000" } },
          { insert: "\n" },
          { insert: "c\n", attributes: { color: "#000000" } },
        ],
      });
    });
  });
});
