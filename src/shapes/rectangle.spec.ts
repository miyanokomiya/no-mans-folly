import { expect, describe, test, vi } from "vitest";
import { struct } from "./rectangle";

describe("struct", () => {
  describe("create", () => {
    test("should return new shape", () => {
      const result = struct.create();
      expect(result.width).toBe(100);
    });
  });

  describe("render", () => {
    test("should render the shape", () => {
      const shape = struct.create();
      const ctx = {
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
      };
      struct.render(ctx as any, shape);
      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.strokeRect).toHaveBeenCalled();
    });
  });
});
