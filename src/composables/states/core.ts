import { IVec2 } from "okageo";
import { EditMovement, HoverMovement, KeyOptions, MouseOptions } from "./types";
import { newCallback } from "../reactives";

type TransitionType = "break" | "stack-restart" | "stack-resume";

export type TransitionValue<C, E = ModeStateEvent> =
  | (() => ModeStateBase<C, E>)
  | { getState: () => ModeStateBase<C, E>; type: TransitionType }
  | { type: "break" }
  | void;

export interface ModeStateBase<C, E = ModeStateEvent> {
  getLabel: () => string;
  onStart?: (ctx: ModeStateContextBase & C) => Promise<void>;
  onEnd?: (ctx: C) => Promise<void>;
  handleEvent: (ctx: C, e: E) => Promise<TransitionValue<C, ModeStateEvent>>;
  render?: (ctx: C, renderCtx: CanvasRenderingContext2D) => void;
}

type StateStackItem<C, E = ModeStateEvent> = {
  state: ModeStateBase<C, E>;
  type?: TransitionType;
};

interface StateMachine<E = ModeStateEvent> {
  getStateSummary: () => { label: string };
  handleEvent: (event: E) => Promise<void>;
  render: (ctx: CanvasRenderingContext2D) => void;
  dispose: () => Promise<void>;
  // This will be resolved when "onStart" of the initial state finishes
  ready: Promise<void>;
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
  const ready = getCurrentState().state.onStart?.(getCtx()) ?? Promise.resolve();

  function getStateSummary() {
    return {
      label: getCurrentState().state.getLabel(),
    };
  }

  async function handleEvent(event: E): Promise<void> {
    const ctx = getCtx();
    const ret = await getCurrentState().state.handleEvent(ctx, event);
    if (ret) {
      if (typeof ret === "function") {
        await switchState(ctx, ret() as any);
      } else if (ret.type !== "break") {
        await switchState(ctx, ret.getState() as any, ret.type);
      } else {
        await breakState(ctx);
      }
    }
  }

  async function breakState(ctx: ModeStateContextBase & C) {
    const current = getCurrentState();
    await current.state.onEnd?.(ctx);

    stateStack.pop();
    if (stateStack.length === 0) {
      stateStack.push({ state: getInitialState() });
    }

    const next = getCurrentState();
    if (current.type !== "stack-resume") {
      await next.state.onStart?.(ctx);
    }

    callback.dispatch();
  }

  async function switchState(
    ctx: ModeStateContextBase & C,
    nextState: ModeStateBase<C, E>,
    type?: Exclude<TransitionType, "break">
  ): Promise<void> {
    const current = getCurrentState();

    const nextItem = { state: nextState, type };

    switch (type) {
      case "stack-restart":
        await current.state.onEnd?.(ctx);
        stateStack.push(nextItem);
        break;
      case "stack-resume":
        stateStack.push(nextItem);
        break;
      default:
        await current.state.onEnd?.(ctx);
        stateStack[stateStack.length - 1] = { ...nextItem, type: current.type };
        break;
    }

    await nextState.onStart?.(ctx);
    callback.dispatch();
  }

  function render(renderCtx: CanvasRenderingContext2D) {
    const ctx = getCtx();
    const current = getCurrentState();
    current.state.render?.(ctx, renderCtx);
  }

  async function dispose() {
    const ctx = getCtx();
    const current = getCurrentState();
    await current.state.onEnd?.(ctx);
    stateStack.length = 0;
  }

  return {
    getStateSummary,
    handleEvent,
    render,
    dispose,
    ready,
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
    onStart: async (ctx) => {
      await state.onStart?.(ctx);
      sm = newStateMachine(() => ({ ...ctx, ...deriveCtx(ctx) }), getInitialState);
      await sm.ready;
    },
    onEnd: async (ctx) => {
      await sm?.dispose();
      await state.onEnd?.(ctx);
    },
    handleEvent: async (ctx, e) => {
      await sm?.handleEvent(e);
      return await state.handleEvent(ctx, e);
    },
  };
}
