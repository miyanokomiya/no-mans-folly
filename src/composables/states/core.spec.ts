import { expect, describe, test, vi } from "vitest";
import { ModeStateBase, newStateMachine, newGroupState } from "./core";

function getMockState(arg: Partial<ModeStateBase<any>> = {}): ModeStateBase<any> {
  return {
    getLabel: () => "test state",
    onStart: vi.fn(),
    onEnd: vi.fn(),
    handleEvent: vi.fn(),
    ...arg,
  };
}

function getCtx() {
  return {};
}

describe("newStateMachine", () => {
  describe("handleEvent", () => {
    test("should handle the event via current state", () => {
      const current = getMockState({ getLabel: () => "current" });
      const sm = newStateMachine(getCtx, () => current);

      expect(sm.getStateSummary().label).toBe("current");
      sm.handleEvent({ type: "test" } as any);
      expect(current.handleEvent).toHaveBeenNthCalledWith(1, expect.anything(), { type: "test" });
      expect(sm.getStateSummary().label).toBe("current");
    });
    test("should switch next state if current state returns it", () => {
      const current = getMockState({
        getLabel: () => "current",
        handleEvent: vi.fn().mockReturnValue(() => getMockState({ getLabel: () => "next" })),
      });
      const sm = newStateMachine(getCtx, () => current);

      expect(sm.getStateSummary().label).toBe("current");
      sm.handleEvent({ type: "test" } as any);
      expect(current.handleEvent).toHaveBeenNthCalledWith(1, expect.anything(), { type: "test" });
      expect(sm.getStateSummary().label).toBe("next");
    });
  });

  describe("onStart", () => {
    test("should handle state transition when it's returned", () => {
      const current = getMockState({ getLabel: () => "current" });
      const next1 = getMockState({ getLabel: () => "next1" });
      const next2 = getMockState({ getLabel: () => "next2" });
      next1.onStart = () => () => next2;
      current.handleEvent = () => () => next1;
      const sm = newStateMachine(getCtx, () => current);

      expect(sm.getStateSummary().label).toBe("current");
      sm.handleEvent({ type: "test" } as any);
      expect(sm.getStateSummary().label).toBe("next2");
    });

    test("should stop handling event during onStart processing", () => {
      const current = getMockState({
        getLabel: () => "current",
      });
      const next1 = getMockState({ getLabel: () => "next1" });
      current.handleEvent = () => {
        return () => next1;
      };
      const startSpy = vi.fn();
      const sm = newStateMachine(getCtx, () => current);
      next1.onStart = () => {
        startSpy();
        sm.handleEvent({ type: "test" } as any);
      };
      const handleSpy = vi.fn();
      next1.handleEvent = () => {
        handleSpy();
      };
      sm.handleEvent({ type: "test" } as any);
      expect(startSpy).toHaveBeenCalledTimes(1);
      expect(handleSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe("onEnd", () => {
    test("should stop handling event during onEnd processing", () => {
      const current = getMockState({
        getLabel: () => "current",
      });
      const next1 = getMockState({ getLabel: () => "next1" });
      const handleSpy = vi.fn();
      current.handleEvent = () => {
        handleSpy();
        return () => next1;
      };
      const endSpy = vi.fn();
      current.onEnd = () => {
        endSpy();
        sm.handleEvent({ type: "test" } as any);
      };
      const sm = newStateMachine(getCtx, () => current);

      sm.handleEvent({ type: "test" } as any);
      expect(sm.getStateSummary().label).toBe("next1");
      expect(handleSpy).toHaveBeenCalledTimes(1);
      expect(endSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("transition: stack-restart", () => {
    test("should stack and restart previous state", () => {
      const current = getMockState({
        getLabel: () => "0",
        onStart: vi.fn().mockReturnValue(undefined),
        handleEvent: vi.fn().mockReturnValue({
          getState: () =>
            getMockState({
              getLabel: () => "1",
              handleEvent: vi.fn().mockReturnValue({ type: "break" }),
            }),
          type: "stack-restart",
        }),
      });
      const sm = newStateMachine(getCtx, () => current);

      expect(current.onStart).toHaveBeenCalledTimes(1);
      expect(sm.getStateSummary().label).toBe("0");
      sm.handleEvent({ type: "test" } as any);
      expect(current.onEnd).toHaveBeenCalledTimes(1);
      expect(sm.getStateSummary().label).toBe("1");
      sm.handleEvent({ type: "test" } as any);
      expect(current.onStart).toHaveBeenCalledTimes(2);
      expect(sm.getStateSummary().label).toBe("0");
    });
  });

  describe("transition: stack-resume", () => {
    test("should stack and resume previous state", () => {
      const current = getMockState({
        getLabel: () => "0",
        onStart: vi.fn().mockReturnValue(undefined),
        onEnd: vi.fn().mockReturnValue(undefined),
        handleEvent: vi.fn().mockReturnValue({
          getState: () =>
            getMockState({
              getLabel: () => "1",
              handleEvent: vi.fn().mockReturnValue({ type: "break" }),
            }),
          type: "stack-resume",
        }),
      });
      const sm = newStateMachine(getCtx, () => current);

      expect(current.onStart).toHaveBeenCalledTimes(1);
      expect(sm.getStateSummary().label).toBe("0");
      sm.handleEvent({ type: "test" } as any);
      expect(current.onEnd).toHaveBeenCalledTimes(0);
      expect(sm.getStateSummary().label).toBe("1");
      sm.handleEvent({ type: "test" } as any);
      expect(current.onStart).toHaveBeenCalledTimes(1);
      expect(sm.getStateSummary().label).toBe("0");
    });
  });

  describe("transition: stack then move", () => {
    test("should clear all stacked states", () => {
      const next2 = getMockState({
        getLabel: () => "2",
        handleEvent: vi.fn().mockReturnValue(() => getMockState({ getLabel: () => "3" })),
      });
      const next1 = getMockState({
        getLabel: () => "1",
        handleEvent: vi.fn().mockReturnValue({ type: "stack-resume", getState: () => next2 }),
      });
      const current = getMockState({
        getLabel: () => "0",
        onStart: vi.fn().mockReturnValue(undefined),
        onEnd: vi.fn().mockReturnValue(undefined),
        handleEvent: vi.fn().mockReturnValue({
          getState: () => next1,
          type: "stack-resume",
        }),
      });
      const sm = newStateMachine(getCtx, () => current);

      expect(sm.getStateSummary().label).toBe("0");
      sm.handleEvent({ type: "test" } as any);
      expect(sm.getStateSummary().label).toBe("1");
      sm.handleEvent({ type: "test" } as any);
      expect(sm.getStateSummary().label).toBe("2");
      sm.handleEvent({ type: "test" } as any);
      expect(sm.getStateSummary().label).toBe("3");
      expect(current.onEnd).toHaveBeenCalledTimes(1);
      expect(next1.onEnd).toHaveBeenCalledTimes(1);
      expect(next2.onEnd).toHaveBeenCalledTimes(1);
    });
  });
});

describe("newObjectGroupState", () => {
  test("should create group state", () => {
    const eventCalled: string[] = [];
    const childAB = getMockState({ getLabel: () => "ab" });
    const childAA = getMockState({
      getLabel: () => "aa",
      handleEvent: () => {
        eventCalled.push("aa");
        return () => childAB;
      },
    });
    const groupASrc = getMockState({
      getLabel: () => "a",
      handleEvent: () => {
        eventCalled.push("a");
      },
    });
    const groupA = newGroupState<any, any>(
      () => groupASrc,
      () => childAA,
      (ctx) => ctx,
    );

    const sm = newStateMachine(getCtx, () => groupA);
    expect(sm.getStateSummary().label).toBe("a:aa");
    expect(groupASrc.onStart).toHaveBeenCalledTimes(1);
    expect(childAA.onStart).toHaveBeenCalledTimes(1);

    sm.handleEvent({ type: "keydown", data: { key: "a" } });
    expect(sm.getStateSummary().label).toBe("a:ab");
    expect(groupASrc.onStart).toHaveBeenCalledTimes(1);
    expect(groupASrc.onEnd).toHaveBeenCalledTimes(0);
    expect(childAA.onEnd).toHaveBeenCalledTimes(1);
    expect(childAB.onStart).toHaveBeenCalledTimes(1);
    expect(eventCalled).toEqual(["aa", "a"]);

    sm.dispose();
    expect(groupASrc.onEnd).toHaveBeenCalledTimes(1);
    expect(childAB.onEnd).toHaveBeenCalledTimes(1);
  });
});
