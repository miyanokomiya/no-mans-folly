import { IVec2 } from "okageo";
import { EditMovement, HoverMovement, KeyOptions, MouseOptions } from "./types";
import { ModifierOptions } from "../../utils/devices";
import { newCallback } from "../reactives";

type TransitionType = "break" | "stack-restart" | "stack-resume";

export type TransitionValue<C, E = ModeStateEvent> =
  | (() => ModeStateBase<C, E>)
  | { getState: () => ModeStateBase<C, E>; type: TransitionType }
  | { type: "break" }
  | null // Can be used to let the returned value have some meaning but remain void.
  | void;

export interface ModeStateBase<C, E = ModeStateEvent> {
  getLabel: () => string;
  onStart?: (ctx: ModeStateContextBase & C) => TransitionValue<C, ModeStateEvent>;
  onResume?: (ctx: ModeStateContextBase & C) => TransitionValue<C, ModeStateEvent>;
  onEnd?: (ctx: C) => void;
  /**
   * Don't use this attribute casually.
   * Consider using "defineAsyncState" instead.
   */
  _resolved?: Promise<TransitionValue<C, ModeStateEvent>>;
  handleEvent: (ctx: C, e: E) => TransitionValue<C, ModeStateEvent>;
  render?: (ctx: C, renderCtx: CanvasRenderingContext2D) => void;
}

type StateStackItem<C, E = ModeStateEvent> = {
  state: ModeStateBase<C, E>;
  type?: TransitionType;
};

export interface StateMachine<E = ModeStateEvent> {
  getStateSummary: () => { label: string };
  handleEvent: (event: E) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
  reset: () => void;
  dispose: () => void;
  // This will be resolved when "onStart" of the initial state finishes
  watch: (fn: () => void) => () => void;
}

export function newStateMachine<C, E = ModeStateEvent>(
  getCtx: () => ModeStateContextBase & C,
  getInitialState: () => ModeStateBase<C, E>,
): StateMachine<E> {
  const stateStack: StateStackItem<C, E>[] = [];
  const callback = newCallback();
  let eventBlocked = false;

  function blockEvent<T>(fn: () => T): T {
    eventBlocked = true;
    try {
      return fn();
    } finally {
      eventBlocked = false;
    }
  }

  function getCurrentState(): StateStackItem<C, E> {
    return stateStack[stateStack.length - 1];
  }

  function getStateSummary() {
    return {
      label: getCurrentState().state.getLabel(),
    };
  }

  function reset(): void {
    switchState(getCtx(), getInitialState());
  }

  function handleEvent(event: E): void {
    if (eventBlocked) return;

    const ctx = getCtx();
    const ret = getCurrentState().state.handleEvent(ctx, event);
    handleTransition(ret);
  }

  function handleTransition(transition: TransitionValue<C, ModeStateEvent>): void {
    if (transition) {
      const ctx = getCtx();
      if (typeof transition === "function") {
        switchState(ctx, transition() as any);
      } else if (transition.type !== "break") {
        switchState(ctx, transition.getState() as any, transition.type);
      } else {
        breakState(ctx);
      }
    }
  }

  function breakState(ctx: ModeStateContextBase & C) {
    const current = getCurrentState();
    blockEvent(() => {
      current.state.onEnd?.(ctx);
    });

    stateStack.pop();
    if (stateStack.length === 0) {
      stateStack.push({ state: getInitialState() });
    }

    const next = getCurrentState();
    if (current.type === "stack-resume") {
      const result = next.state.onResume?.(ctx);
      if (result) {
        handleTransition(result);
        return;
      }
    } else {
      const result = blockEvent(() => next.state.onStart?.(ctx));
      if (result) {
        handleTransition(result);
        return;
      }
    }

    callback.dispatch();
  }

  function switchState(
    ctx: ModeStateContextBase & C,
    nextState: ModeStateBase<C, E>,
    type?: Exclude<TransitionType, "break">,
  ): void {
    const current = getCurrentState();

    const nextItem = { state: nextState, type };

    switch (type) {
      case "stack-restart":
        blockEvent(() => {
          current.state.onEnd?.(ctx);
        });
        stateStack.push(nextItem);
        break;
      case "stack-resume":
        stateStack.push(nextItem);
        break;
      default:
        blockEvent(() => {
          stateStack.forEach((s) => {
            s.state.onEnd?.(ctx);
          });
        });
        stateStack.length = 0;
        stateStack.push(nextItem);
        break;
    }

    const result = blockEvent(() => nextState.onStart?.(ctx));
    if (result) {
      handleTransition(result);
      return;
    }

    nextState._resolved?.then((nextTransition) => {
      if (getCurrentState()?.state === nextState) {
        handleTransition(nextTransition);
      }
    });

    callback.dispatch();
  }

  function render(renderCtx: CanvasRenderingContext2D) {
    const ctx = getCtx();
    const current = getCurrentState();
    current.state.render?.(ctx, renderCtx);
  }

  function dispose() {
    const ctx = getCtx();
    const current = getCurrentState();
    blockEvent(() => {
      current.state.onEnd?.(ctx);
    });
    eventBlocked = true;
    stateStack.length = 0;
  }

  reset();
  return {
    getStateSummary,
    handleEvent,
    render,
    reset,
    dispose,
    watch: callback.bind,
  };
}

export interface ModeStateContextBase {
  getTimestamp: () => number;
}

export type ModeStateEvent =
  | PointerMoveEvent
  | PointerHoverEvent
  | PointerDragEvent
  | PointerDownEvent
  | PointerDoubleClickEvent
  | PointerUpEvent
  | KeyDownEvent
  | KeyUpEvent
  | WheelEvent
  | ChangeStateEvent
  | ContextMenuEvent
  | CopyEvent
  | PasteEvent;

export interface ModeStateEventBase {
  type: string;
}

// Called only when the movement is intendedly tracked
export interface PointerMoveEvent extends ModeStateEventBase {
  type: "pointermove";
  data: EditMovement;
}

// Called when the movement is detected
export interface PointerHoverEvent extends ModeStateEventBase {
  type: "pointerhover";
  data: HoverMovement;
}

export interface PointerDragEvent extends ModeStateEventBase {
  type: "pointerdrag";
  data: EditMovement;
}

export interface PointerDownEvent extends ModeStateEventBase {
  type: "pointerdown";
  data: {
    point: IVec2;
    options: MouseOptions;
  };
}

/**
 * When "pointerdown" is detected twice within short period,
 * this event is triggered and the second "pointerdown" and "pointerup" are canceled.
 * i.e. "pointerdown" -> "pointerup" -> "pointerdoubleclick" on double-click.
 */
export interface PointerDoubleClickEvent extends ModeStateEventBase {
  type: "pointerdoubleclick";
  data: {
    point: IVec2;
    options: MouseOptions;
  };
}

export interface PointerUpEvent extends ModeStateEventBase {
  type: "pointerup";
  data: {
    point: IVec2;
    options: MouseOptions;
  };
}

export interface KeyDownEvent extends ModeStateEventBase {
  type: "keydown";
  data: KeyOptions;
  point?: IVec2;
}

export interface KeyUpEvent extends ModeStateEventBase {
  type: "keyup";
  data: KeyOptions;
  point?: IVec2;
}

export interface WheelEvent extends ModeStateEventBase {
  type: "wheel";
  data: {
    delta: IVec2;
    options: MouseOptions;
  };
}

export interface ChangeStateEvent extends ModeStateEventBase {
  type: "state";
  data: {
    name: string;
    options?: any;
  };
}

export interface ContextMenuEvent extends ModeStateEventBase {
  type: "contextmenu";
  data: { point: IVec2 };
}

export interface CopyEvent extends ModeStateEventBase {
  type: "copy";
  nativeEvent: ClipboardEvent;
}

export interface PasteEvent extends ModeStateEventBase {
  type: "paste";
  nativeEvent: ClipboardEvent;
  data: ModifierOptions;
}

export function newGroupState<C, K, E = ModeStateEvent>(
  getState: () => ModeStateBase<C, E>,
  getInitialState: () => ModeStateBase<K, E>,
  deriveCtx: (ctx: C) => K,
): ModeStateBase<C, E> {
  let sm: StateMachine<E> | undefined;
  const state = getState();
  return {
    getLabel: () => state.getLabel() + (sm ? `:${sm.getStateSummary().label}` : ""),
    onStart: (ctx) => {
      state.onStart?.(ctx);
      sm = newStateMachine(() => ({ ...ctx, ...deriveCtx(ctx) }), getInitialState);
    },
    onEnd: (ctx) => {
      sm?.dispose();
      state.onEnd?.(ctx);
    },
    handleEvent: (ctx, e) => {
      sm?.handleEvent(e);
      return state.handleEvent(ctx, e);
    },
  };
}
