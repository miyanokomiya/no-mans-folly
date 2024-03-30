import { CanvasState } from "./commons";
import { TransitionValue } from "./core";

// iOS hasn't supported it.
const withResolvers =
  (Promise as any).withResolvers ??
  (() => {
    let a, b;
    const c = new Promise((resolve, reject) => {
      a = resolve;
      b = reject;
    });
    return { resolve: a, reject: b, promise: c };
  });

interface AsyncContext {
  resolve: (transition: TransitionValue<never>) => void;
}

export function defineAsyncState<O>(
  newStateFn: (asyncCtx: AsyncContext, option: O) => CanvasState,
): (option: O) => CanvasState {
  return (option: O) => {
    const resolvers = withResolvers();
    const state = newStateFn({ resolve: resolvers.resolve }, option);
    state._resolved = resolvers.promise;
    return state;
  };
}
