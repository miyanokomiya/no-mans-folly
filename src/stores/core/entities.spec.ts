import { describe, expect, test } from "vitest";
import { newEntityStore, newSingleEntityStore } from "./entities";
import * as Y from "yjs";
import { generateKeyBetween } from "fractional-indexing";

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

  describe("getEntityMap", () => {
    test("should return a key map of entities", () => {
      const ydoc = new Y.Doc();
      const store = newEntityStore({ name: "test", ydoc });
      store.addEntity({ id: "a", findex: "0" });
      store.addEntity({ id: "b", findex: "1" });
      expect(store.getEntityMap()).toEqual({
        a: { id: "a", findex: "0" },
        b: { id: "b", findex: "1" },
      });
    });
  });

  describe("getEntity", () => {
    test("should return an array of entities", () => {
      const ydoc = new Y.Doc();
      const store = newEntityStore({ name: "test", ydoc });
      store.addEntity({ id: "a", findex: "0" });
      store.addEntity({ id: "b", findex: "1" });
      expect(store.getEntity("a")).toEqual({ id: "a", findex: "0" });
      expect(store.getEntity("c")).toBe(undefined);
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

  describe("addEntities", () => {
    test("should add an entity", () => {
      const ydoc = new Y.Doc();
      const store = newEntityStore({ name: "test", ydoc });
      store.addEntities([
        { id: "a", findex: "0" },
        { id: "b", findex: "1" },
      ]);
      expect(store.getEntities()).toEqual([
        { id: "a", findex: "0" },
        { id: "b", findex: "1" },
      ]);
    });
  });

  describe("removeEntities", () => {
    test("should remove the entity", () => {
      const ydoc = new Y.Doc();
      const store = newEntityStore({ name: "test", ydoc });
      store.addEntity({ id: "a", findex: "0" });
      store.addEntity({ id: "b", findex: "1" });
      store.deleteEntities(["a"]);
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
        { id: "b", findex: "1" },
        { id: "a", findex: "10" },
      ]);
      expect(count).toBe(3);
    });

    test("should delete an attribute if the value is undefined", () => {
      const ydoc = new Y.Doc();
      let count = 0;
      const onChanged = () => count++;
      const store = newEntityStore({ name: "test", ydoc });
      store.watch(onChanged);
      store.addEntity({ id: "a", findex: "0" });
      store.patchEntity("a", { findex: undefined });
      expect(store.getEntities()).toEqual([{ id: "a" }]);
      expect(store.getEntities()[0]).not.toHaveProperty("findex");
      expect(count).toBe(2);
    });
  });

  describe("patchEntities", () => {
    test("should patch the entities", () => {
      const ydoc = new Y.Doc();
      let count = 0;
      const onChanged = () => count++;
      const store = newEntityStore({ name: "test", ydoc });
      store.watch(onChanged);
      store.addEntity({ id: "a", findex: "0" });
      store.addEntity({ id: "b", findex: "1" });
      store.patchEntities({ a: { findex: "10" }, b: { findex: "20" } });
      expect(store.getEntities()).toEqual([
        { id: "a", findex: "10" },
        { id: "b", findex: "20" },
      ]);
      expect(count).toBe(3);
    });
  });

  describe("createFirstIndex", () => {
    test("should return the new first index", () => {
      const ydoc = new Y.Doc();
      const store = newEntityStore({ name: "test", ydoc });
      const i0 = generateKeyBetween(null, null);
      const i1 = generateKeyBetween(i0, null);

      expect(store.createFirstIndex()).toEqual(generateKeyBetween(null, null));
      store.addEntity({ id: "a", findex: i1 });
      store.addEntity({ id: "b", findex: i0 });
      expect(store.createFirstIndex()).toEqual(generateKeyBetween(null, i0));
    });
  });

  describe("createLastIndex", () => {
    test("should return the new last index", () => {
      const ydoc = new Y.Doc();
      const store = newEntityStore({ name: "test", ydoc });
      const i0 = generateKeyBetween(null, null);
      const i1 = generateKeyBetween(i0, null);

      expect(store.createLastIndex()).toEqual(generateKeyBetween(null, null));
      store.addEntity({ id: "a", findex: i1 });
      store.addEntity({ id: "b", findex: i0 });
      expect(store.createLastIndex()).toEqual(generateKeyBetween(i1, null));
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
        { id: "b", findex: "1" },
        { id: "a", findex: "10" },
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

    test("should dispatch related entities' ids", () => {
      const ydoc = new Y.Doc();
      let arg: any;
      const onChanged = (_arg: any) => {
        arg = _arg;
      };
      const store = newEntityStore({ name: "test", ydoc });
      store.watch(onChanged);
      store.addEntity({ id: "a", findex: "0" });
      expect(arg).toEqual(new Set(["a"]));
      store.addEntity({ id: "b", findex: "1" });
      expect(arg).toEqual(new Set(["b"]));
      store.patchEntity("a", { findex: "1" });
      expect(arg).toEqual(new Set(["a"]));
      store.deleteEntities(["a"]);
      expect(arg).toEqual(new Set(["a"]));
    });
  });
});

describe("newSingleEntityStore", () => {
  describe("getEntity", () => {
    test("should return the entity", () => {
      const ydoc = new Y.Doc();
      const store = newSingleEntityStore({ name: "test", ydoc });
      expect(store.getEntity()).toBeTypeOf("object");
    });
  });

  describe("patchEntity", () => {
    test("should patch the entity", () => {
      const ydoc = new Y.Doc();
      let count = 0;
      const onChanged = () => count++;
      const store = newSingleEntityStore({ name: "test", ydoc });
      store.watch(onChanged);
      store.patchEntity({ findex: "10" });
      expect(store.getEntity().findex).toBe("10");
      expect(count).toBe(1);
    });
  });

  describe("transact", () => {
    test("should commit operations in the transaction", () => {
      const ydoc = new Y.Doc();
      let count = 0;
      const onChanged = () => count++;
      const store = newSingleEntityStore({ name: "test", ydoc });
      store.watch(onChanged);
      store.transact(() => {
        store.patchEntity({ findex: "10" });
        store.patchEntity({ findex: "20" });
        store.patchEntity({ findex: "30" });
      });
      expect(store.getEntity().findex).toBe("30");
      expect(count).toBe(1);
    });
  });

  describe("watch", () => {
    test("should watch entities and return a function to unwatch", () => {
      const ydoc = new Y.Doc();
      let count = 0;
      const onChanged = () => count++;
      const store = newSingleEntityStore({ name: "test", ydoc });
      const unwatch = store.watch(onChanged);
      store.patchEntity({ findex: "10" });
      store.patchEntity({ findex: "20" });
      expect(count).toBe(2);

      unwatch();
      store.patchEntity({ findex: "30" });
      expect(count).toBe(2);
    });
  });
});
