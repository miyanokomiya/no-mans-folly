import { expect, describe, test } from "vitest";
import * as Y from "yjs";
import { newShapeStore } from "./shapes";
import { createShape, getCommonStruct } from "../shapes";

describe("newShapeStore", () => {
  test("should cache shape composite until shapes or temporary shapes change", () => {
    const ydoc = new Y.Doc();
    const store = newShapeStore({ ydoc });
    store.addEntity(createShape(getCommonStruct, "rectangle", { id: "a" }));
    const sc0 = store.shapeComposite;

    store.setTmpShapeMap({ a: { p: { x: 10, y: 10 } } });
    const sc1 = store.shapeComposite;
    expect(sc0).not.toBe(sc1);
    expect(sc1.tmpShapeMap).toEqual({ a: { p: { x: 10, y: 10 } } });

    store.addEntity(createShape(getCommonStruct, "rectangle", { id: "b" }));
    const sc2 = store.staticShapeComposite;
    expect(sc1).not.toBe(sc2);
    expect(sc2.shapes).toHaveLength(2);
  });

  test("should not update static shape composite unless shapes change", () => {
    const ydoc = new Y.Doc();
    const store = newShapeStore({ ydoc });
    store.addEntity(createShape(getCommonStruct, "rectangle", { id: "a" }));
    const ssc0 = store.staticShapeComposite;

    store.setTmpShapeMap({ a: { p: { x: 10, y: 10 } } });
    expect(ssc0).toBe(store.staticShapeComposite);
    expect(ssc0.tmpShapeMap).toEqual({});

    store.addEntity(createShape(getCommonStruct, "rectangle", { id: "b" }));
    const ssc1 = store.staticShapeComposite;
    expect(ssc0).not.toBe(ssc1);
    expect(ssc1.shapes).toHaveLength(2);
    expect(ssc1.tmpShapeMap).toEqual({});
  });
});
