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

    test("should delete attributes supplied as null", () => {
      const ydoc = new Y.Doc();
      const store = newDocumentStore({ ydoc });
      store.addDoc("a", [{ insert: "a", attributes: { background: "#rgba(1,1,1,1)" } }]);
      expect(store.getDocMap()).toEqual({ a: [{ insert: "a", attributes: { background: "#rgba(1,1,1,1)" } }] });
      store.patchDoc("a", [{ retain: 1, attributes: { background: null } }]);
      expect(store.getDocMap()).toEqual({ a: [{ insert: "a" }] });
    });
  });

  describe("patchDocDryRun", () => {
    test("should return patched doc without updating the store", () => {
      const ydoc = new Y.Doc();
      const store = newDocumentStore({ ydoc });
      store.addDoc("a", [{ insert: "a" }]);
      const result = store.patchDocDryRun("a", [{ retain: 1 }, { insert: "b" }]);
      expect(result).toEqual([{ insert: "ab" }]);
      expect(store.getDocMap()).toEqual({
        a: [{ insert: "a" }],
      });
    });

    test("should return patched doc even if the original doesn't yet exist", () => {
      const ydoc = new Y.Doc();
      const store = newDocumentStore({ ydoc });
      const result = store.patchDocDryRun("a", [{ insert: "b" }]);
      expect(result).toEqual([{ insert: "b" }]);
      expect(store.getDocMap()).toEqual({});
    });
  });

  describe("watch", () => {
    test("should watch entities and return a function to unwatch", () => {
      const ydoc = new Y.Doc();
      let count = 0;
      const onChanged = () => count++;
      const store = newDocumentStore({ ydoc });
      const unwatch = store.watch(onChanged);
      store.addDoc("a", [{ insert: "a" }]);
      store.addDoc("b", [{ insert: "b" }]);
      expect(count).toBe(2);

      unwatch();
      store.patchDoc("a", [{ retain: 1 }, { insert: "x" }]);
      expect(count).toBe(2);
    });

    test("should dispatch related entities' ids", () => {
      const ydoc = new Y.Doc();
      let arg: any;
      const onChanged = (_arg: any) => {
        arg = _arg;
      };
      const store = newDocumentStore({ ydoc });
      store.watch(onChanged);
      store.addDoc("a", [{ insert: "a" }]);
      expect(arg).toEqual(new Set(["a"]));
      store.addDoc("b", [{ insert: "b" }]);
      expect(arg).toEqual(new Set(["b"]));
      store.patchDoc("a", [{ retain: 1 }, { insert: "x" }]);
      expect(arg).toEqual(new Set(["a"]));
      store.deleteDocs(["a"]);
      expect(arg).toEqual(new Set(["a"]));
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
