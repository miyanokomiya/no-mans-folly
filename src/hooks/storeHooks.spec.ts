import { expect, describe, test, beforeEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useHasMultipleSheet, useHasShape } from "./storeHooks";
import { newShapeStore } from "../stores/shapes";
import * as Y from "yjs";
import { createShape, getCommonStruct } from "../shapes";
import { newSheetStore } from "../stores/sheets";

describe("useHasShape", () => {
  beforeEach(() => {
    cleanup();
  });

  test("should return true when a shape exists in the store", () => {
    const ydoc = new Y.Doc();
    const shapeStore = newShapeStore({ ydoc });
    const rendered = renderHook(() => useHasShape(shapeStore));
    expect(rendered.result.current).toBe(false);
    shapeStore.addEntity(createShape(getCommonStruct, "rectangle", { id: "a" }));
    rendered.rerender();
    expect(rendered.result.current).toBe(true);
    shapeStore.addEntity(createShape(getCommonStruct, "rectangle", { id: "b" }));
    rendered.rerender();
    expect(rendered.result.current).toBe(true);
    shapeStore.deleteEntities(["a"]);
    rendered.rerender();
    expect(rendered.result.current).toBe(true);
    shapeStore.deleteEntities(["b"]);
    rendered.rerender();
    expect(rendered.result.current).toBe(false);
  });
});

describe("useHasMultipleSheet", () => {
  beforeEach(() => {
    cleanup();
  });

  test("should return true when multiple sheets exist in the store", () => {
    const ydoc = new Y.Doc();
    const sheetStore = newSheetStore({ ydoc });
    const rendered = renderHook(() => useHasMultipleSheet(sheetStore));
    expect(rendered.result.current).toBe(false);
    sheetStore.addEntity({ id: "a", name: "a", findex: "Aa" });
    rendered.rerender();
    expect(rendered.result.current).toBe(false);
    sheetStore.addEntity({ id: "b", name: "b", findex: "Ba" });
    rendered.rerender();
    expect(rendered.result.current).toBe(true);
    sheetStore.deleteEntities(["a"]);
    rendered.rerender();
    expect(rendered.result.current).toBe(false);
  });
});
