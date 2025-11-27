import { describe, test, expect, vi } from "vitest";
import { handleLineVertexExistence, handleShapeUpdate } from "./shapeUpdatedEventHandlers";
import { newShapeComposite } from "../../../shapeComposite";
import { createShape, getCommonStruct } from "../../../../shapes";
import { LineShape } from "../../../../shapes/line";

describe("handleShapeUpdate", () => {
  test("should finish the state when the shape updates", () => {
    const shapes = [
      createShape(getCommonStruct, "rectangle", { id: "a" }),
      createShape(getCommonStruct, "rectangle", { id: "b" }),
    ];
    const newSelectionHubState = vi.fn();
    const ctx = {
      getShapeComposite: () => newShapeComposite({ shapes, getStruct: getCommonStruct }),
      states: { newSelectionHubState },
    };

    const result0 = handleShapeUpdate(ctx, { type: "shape-updated", data: { keys: new Set(["a"]) } }, ["a", "b"]);
    expect(result0).toBe(newSelectionHubState);

    const result1 = handleShapeUpdate(ctx, { type: "shape-updated", data: { keys: new Set(["a"]) } }, ["b"]);
    expect(result1).toBe(undefined);
  });
});

describe("handleLineVertexExistence", () => {
  test("should finish the state when the line or the vertex doesn't exist", () => {
    const shapes = [createShape<LineShape>(getCommonStruct, "line", { id: "a", body: [{ p: { x: 10, y: 10 } }] })];
    const newSelectionHubState = vi.fn();
    const ctx = {
      getShapeComposite: () => newShapeComposite({ shapes, getStruct: getCommonStruct }),
      states: { newSelectionHubState },
    };

    const result0 = handleLineVertexExistence(ctx, { type: "shape-updated", data: { keys: new Set(["a"]) } }, "a", 2);
    expect(result0).toBe(undefined);

    const result1 = handleLineVertexExistence(ctx, { type: "shape-updated", data: { keys: new Set(["a"]) } }, "a", 3);
    expect(result1).toBe(newSelectionHubState);

    const result2 = handleLineVertexExistence(ctx, { type: "shape-updated", data: { keys: new Set(["a"]) } }, "b", 0);
    expect(result2).toBe(undefined);
  });
});
