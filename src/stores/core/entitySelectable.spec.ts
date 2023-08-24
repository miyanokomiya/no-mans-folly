import { expect, describe, test, vi } from "vitest";
import { newEntitySelectable } from "./entitySelectable";

describe("newEntitySelectable", () => {
  test("should deselect deleted entries", () => {
    let entityMap: any = { a: {}, b: {}, c: {} };
    let onWatchEntities = () => {};
    const target = newEntitySelectable({
      getEntityMap: () => entityMap,
      watchEntities: (fn) => {
        onWatchEntities = fn;
        return () => {};
      },
    });
    target.multiSelect(["a", "b", "c"]);
    expect(target.getSelected()).toEqual({ a: true, b: true, c: true });
    entityMap = { a: {}, c: {} };
    onWatchEntities();
    expect(target.getSelected()).toEqual({ a: true, c: true });
    entityMap = { a: {} };
    onWatchEntities();
    expect(target.getSelected()).toEqual({ a: true });
  });

  describe("dispose", () => {
    test("should clean up callbacks", () => {
      const clear = vi.fn();
      const target = newEntitySelectable({
        getEntityMap: () => ({}),
        watchEntities: () => clear,
      });
      target.dispose();
      expect(clear).toHaveBeenCalled();
    });
  });
});
