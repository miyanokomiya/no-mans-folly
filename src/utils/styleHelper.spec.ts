import { describe, test, expect } from "vitest";
import * as target from "./styleHelper";

describe("getResizingCursorStyle", () => {
  test("should return most probable cursor style", () => {
    expect(target.getResizingCursorStyle(0)).toBe("ew-resize");
    expect(target.getResizingCursorStyle(Math.PI * 0.25)).toBe("nwse-resize");
    expect(target.getResizingCursorStyle(Math.PI * 0.5)).toBe("ns-resize");
    expect(target.getResizingCursorStyle(Math.PI * 0.75)).toBe("nesw-resize");
    expect(target.getResizingCursorStyle(Math.PI)).toBe("ew-resize");

    expect(target.getResizingCursorStyle(-Math.PI * 0.25)).toBe("nesw-resize");
    expect(target.getResizingCursorStyle(-Math.PI * 0.5)).toBe("ns-resize");
    expect(target.getResizingCursorStyle(-Math.PI * 0.75)).toBe("nwse-resize");
    expect(target.getResizingCursorStyle(-Math.PI)).toBe("ew-resize");
  });
});
