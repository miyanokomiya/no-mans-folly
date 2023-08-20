import { expect, describe, test, vi } from "vitest";
import { createShape, getCommonStruct, renderShape } from ".";

describe("createShape", () => {
  test("should return new shape", () => {
    const result = createShape(getCommonStruct, "rectangle", { id: "test" });
    expect(result.id).toBe("test");
    expect(result.type).toBe("rectangle");
  });
});

describe("renderShape", () => {
  test("should render the shape", () => {
    const shape = createShape(getCommonStruct, "rectangle", { id: "test" });
    const ctx = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
    };
    renderShape(getCommonStruct, ctx as any, shape);
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.strokeRect).toHaveBeenCalled();
  });
});
