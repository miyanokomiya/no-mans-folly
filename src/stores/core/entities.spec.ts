import { describe, expect, test } from "vitest";
import { newEntityStore } from "./entities";
import * as Y from "yjs";

describe("newEntityStore", () => {
  describe("getEntities", () => {
    test("should return an array of entities", () => {
      const ydoc = new Y.Doc();
      const store = newEntityStore({ name: "test", ydoc });
      expect(store.getEntities()).toEqual([]);

      store.addEntity({ id: "a", findex: "0" });
      store.addEntity({ id: "b", findex: "1" });
      expect(store.getEntities()).toEqual([
        { id: "a", findex: "0" },
        { id: "b", findex: "1" },
      ]);
    });
  });

  describe("addEntity", () => {
    test("should add an entity", () => {
      const ydoc = new Y.Doc();
      const store = newEntityStore({ name: "test", ydoc });
      store.addEntity({ id: "a", findex: "0" });
      expect(store.getEntities()).toEqual([{ id: "a", findex: "0" }]);

      store.addEntity({ id: "b", findex: "1" });
      expect(store.getEntities()).toEqual([
        { id: "a", findex: "0" },
        { id: "b", findex: "1" },
      ]);
    });
  });

  describe("removeEntity", () => {
    test("should remove the entity", () => {
      const ydoc = new Y.Doc();
      const store = newEntityStore({ name: "test", ydoc });
      store.addEntity({ id: "a", findex: "0" });
      store.addEntity({ id: "b", findex: "1" });
      store.removeEntity("a");
      expect(store.getEntities()).toEqual([{ id: "b", findex: "1" }]);
    });
  });

  describe("patchEntity", () => {
    test("should patch the entity", () => {
      const ydoc = new Y.Doc();
      let count = 0;
      const onChanged = () => count++;
      const store = newEntityStore({ name: "test", ydoc });
      store.watch(onChanged);
      store.addEntity({ id: "a", findex: "0" });
      store.addEntity({ id: "b", findex: "1" });
      store.patchEntity("a", { findex: "10" });
      expect(store.getEntities()).toEqual([
        { id: "a", findex: "10" },
        { id: "b", findex: "1" },
      ]);
      expect(count).toBe(3);
    });
  });

  describe("transact", () => {
    test("should commit operations in the transaction", () => {
      const ydoc = new Y.Doc();
      let count = 0;
      const onChanged = () => count++;
      const store = newEntityStore({ name: "test", ydoc });
      store.watch(onChanged);
      store.transact(() => {
        store.addEntity({ id: "a", findex: "0" });
        store.addEntity({ id: "b", findex: "1" });
        store.patchEntity("a", { findex: "10" });
      });
      expect(store.getEntities()).toEqual([
        { id: "a", findex: "10" },
        { id: "b", findex: "1" },
      ]);
      expect(count).toBe(1);
    });
  });

  describe("watch", () => {
    test("should watch entities and return a function to unwatch", () => {
      const ydoc = new Y.Doc();
      let count = 0;
      const onChanged = () => count++;
      const store = newEntityStore({ name: "test", ydoc });
      const unwatch = store.watch(onChanged);
      store.addEntity({ id: "a", findex: "0" });
      store.addEntity({ id: "b", findex: "1" });
      expect(store.getEntities()).toEqual([
        { id: "a", findex: "0" },
        { id: "b", findex: "1" },
      ]);
      expect(count).toBe(2);

      unwatch();
      store.patchEntity("a", { findex: "0" });
      expect(count).toBe(2);
    });
  });
});
