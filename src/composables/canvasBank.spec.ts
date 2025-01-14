import { describe, test, expect, beforeEach } from "vitest";
import { newCanvasBank } from "./canvasBank";

describe("newCanvasBank", () => {
  beforeEach(() => {
    (window.OffscreenCanvas as any) ??= class {};
  });

  test("should create and store canvases", () => {
    const target = newCanvasBank();
    target.beginCanvas(() => {});
    expect(target.size()).toBe(1);

    target.beginCanvas(() => {
      target.beginCanvas(() => {
        target.beginCanvas(() => {});
      });
    });
    expect(target.size()).toBe(3);

    target.beginCanvas(() => {});
    expect(target.size()).toBe(3);
  });
});
