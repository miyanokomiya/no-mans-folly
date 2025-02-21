import { expect, test, describe, vi } from "vitest";
import { createShape, getCommonStruct } from "../../../shapes";
import { UserSetting } from "../../../models";
import { RectangleShape } from "../../../shapes/rectangle";
import { newShapeComposite } from "../../shapeComposite";
import { newPointerDownEmptyState } from "./pointerDownEmptyState";
import { newStateMachine } from "../core";
import { createInitialAppCanvasStateContext } from "../../../contexts/AppCanvasContext";
import { createStyleScheme } from "../../../models/factories";

function getMockCtx(userSetting?: UserSetting) {
  return {
    ...createInitialAppCanvasStateContext({
      getTimestamp: Date.now,
      generateUuid: () => "id",
      getStyleScheme: createStyleScheme,
      getUserSetting: () => userSetting ?? {},
    }),
    getShapeComposite: () =>
      newShapeComposite({
        shapes: [createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a", width: 50, height: 50 })],
        getStruct: getCommonStruct,
      }),
    clearAllSelected: vi.fn(),
  };
}

describe("newPointerDownEmptyState", () => {
  describe("leftDragAction: rect-select", () => {
    test("should move to RectangleSelecting state if button is 0", () => {
      const ctx = getMockCtx();
      const sm = newStateMachine(
        () => ctx as any,
        () => newPointerDownEmptyState(),
      );
      expect(sm.getStateSummary().label).toBe("RectangleSelecting");
    });

    test("should move to Panning state if button is 1", () => {
      const ctx = getMockCtx();
      const sm = newStateMachine(
        () => ctx as any,
        () => newPointerDownEmptyState({ button: 1 }),
      );
      expect(sm.getStateSummary().label).toBe("Panning");
    });
  });

  describe("leftDragAction: pan", () => {
    test("should move to Panning state if button is 0", () => {
      const ctx = getMockCtx({ leftDragAction: "pan" });
      const sm = newStateMachine(
        () => ctx as any,
        () => newPointerDownEmptyState(),
      );
      expect(sm.getStateSummary().label).toBe("Panning");
    });

    test("should move to RectangleSelecting state if button is 1", () => {
      const ctx = getMockCtx({ leftDragAction: "pan" });
      const sm = newStateMachine(
        () => ctx as any,
        () => newPointerDownEmptyState({ button: 1 }),
      );
      expect(sm.getStateSummary().label).toBe("RectangleSelecting");
    });

    test("should not move to RectangleSelecting state if preventSelecting is set true", () => {
      const ctx = getMockCtx({ leftDragAction: "pan" });
      const sm = newStateMachine(
        () => ctx as any,
        () => newPointerDownEmptyState({ button: 1, preventSelecting: true }),
      );
      expect(sm.getStateSummary().label).toBe("Default");
    });
  });
});
