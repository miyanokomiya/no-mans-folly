import { expect, describe, test, beforeEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react-hooks";
import { useCanvas } from "./canvas";

describe("useCanvas", () => {
  const getWrapper = () => ({
    getBoundingClientRect: () => ({ x: 10, y: 20, width: 100, height: 200 }),
  });

  beforeEach(() => {
    cleanup();
  });

  describe("view transition", () => {
    test("should pan the viewport", () => {
      const rendered = renderHook(() => useCanvas(getWrapper));
      act(() => {
        rendered.result.current.setMousePoint({ x: 0, y: 0 });
      });
      act(() => {
        rendered.result.current.startMoving();
      });
      act(() => {
        rendered.result.current.panView({
          start: { x: 0, y: 0 },
          current: { x: -10, y: -20 },
          scale: 1,
        });
      });
      expect(rendered.result.current.viewToCanvas({ x: 10, y: 10 })).toEqual({ x: 20, y: 30 });
    });

    test("should fit the range", () => {
      const rendered = renderHook(() => useCanvas(getWrapper));
      act(() => {
        rendered.result.current.setViewSize({ width: 100, height: 200 });
      });
      act(() => {
        rendered.result.current.setViewport({
          x: -50,
          y: -100,
          width: 100,
          height: 200,
        });
      });
      expect(rendered.result.current.viewOrigin).toEqual({ x: -50, y: -100 });
      expect(rendered.result.current.scale).toBe(1);

      act(() => {
        rendered.result.current.setViewport({
          x: 0,
          y: 0,
          width: 200,
          height: 400,
        });
      });
      expect(rendered.result.current.viewOrigin).toEqual({ x: 0, y: 0 });
      expect(rendered.result.current.scale).toBe(2);

      act(() => {
        rendered.result.current.setViewport();
      });
      expect(rendered.result.current.viewOrigin).toEqual({ x: -50, y: -100 });
      expect(rendered.result.current.scale).toBe(1);

      act(() => {
        rendered.result.current.setViewport(
          {
            x: -50,
            y: -100,
            width: 100,
            height: 200,
          },
          10
        );
      });
      expect(rendered.result.current.viewOrigin).toEqual({ x: -60, y: -120 });
      expect(rendered.result.current.scale).toBe(1.2);
    });
  });
});
