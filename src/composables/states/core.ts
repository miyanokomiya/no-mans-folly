import { IVec2 } from "okageo";
import { EditMovement, HoverMovement, KeyOptions, ModifierOptions, MouseOptions } from "./types";
import { newCallback } from "../reactives";

type TransitionType = "break" | "stack-restart" | "stack-resume";

export type TransitionValue<C, E = ModeStateEvent> =
  | (() => ModeStateBase<C, E>)
  | { getState: () => ModeStateBase<C, E>; type: TransitionType }
  | { type: "break" }
  | void;

export interface ModeStateBase<C, E = ModeStateEvent> {
  getLabel: () => string;
  onStart?: (ctx: ModeStateContextBase & C) => void;
  onEnd?: (ctx: C) => void;
  handleEvent: (ctx: C, e: E) => TransitionValue<C, ModeStateEvent>;
  render?: (ctx: C, renderCtx: CanvasRenderingContext2D) => void;
}

type StateStackItem<C, E = ModeStateEvent> = {
  state: ModeStateBase<C, E>;
  type?: TransitionType;
};

interface StateMachine<E = ModeStateEvent> {
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
  getInitialState: () => ModeStateBase<C, E>
): StateMachine<E> {
  const stateStack: StateStackItem<C, E>[] = [{ state: getInitialState() }];
  const callback = newCallback();

  function getCurrentState(): StateStackItem<C, E> {
    return stateStack[stateStack.length - 1];
  }
  getCurrentState().state.onStart?.(getCtx());

  function getStateSummary() {
    return {
      label: getCurrentState().state.getLabel(),
    };
  }

  function reset(): void {
    switchState(getCtx(), getInitialState());
  }

  function handleEvent(event: E): void {
    const ctx = getCtx();
    const ret = getCurrentState().state.handleEvent(ctx, event);
    if (ret) {
      if (typeof ret === "function") {
        switchState(ctx, ret() as any);
      } else if (ret.type !== "break") {
        switchState(ctx, ret.getState() as any, ret.type);
      } else {
        breakState(ctx);
      }
    }
  }

  function breakState(ctx: ModeStateContextBase & C) {
    const current = getCurrentState();
    current.state.onEnd?.(ctx);

    stateStack.pop();
    if (stateStack.length === 0) {
      stateStack.push({ state: getInitialState() });
    }

    const next = getCurrentState();
    if (current.type !== "stack-resume") {
      next.state.onStart?.(ctx);
    }

    callback.dispatch();
  }

  function switchState(
    ctx: ModeStateContextBase & C,
    nextState: ModeStateBase<C, E>,
    type?: Exclude<TransitionType, "break">
  ): void {
    const current = getCurrentState();

    const nextItem = { state: nextState, type };

    switch (type) {
      case "stack-restart":
        current.state.onEnd?.(ctx);
        stateStack.push(nextItem);
        break;
      case "stack-resume":
        stateStack.push(nextItem);
        break;
      default:
        current.state.onEnd?.(ctx);
        stateStack[stateStack.length - 1] = { ...nextItem, type: current.type };
        break;
    }

    nextState.onStart?.(ctx);
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
    current.state.onEnd?.(ctx);
    stateStack.length = 0;
  }

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
  | PointerDoubleDownEvent
  | PointerUpEvent
  | KeyDownEvent
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

export interface PointerDoubleDownEvent extends ModeStateEventBase {
  type: "pointerdoubledown";
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
  data: { key: string } & { [key: string]: string };
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
  deriveCtx: (ctx: C) => K
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
