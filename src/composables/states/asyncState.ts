import { CanvasState } from "./commons";
import { TransitionValue } from "./core";

interface AsyncContext {
  resolve: (transition: TransitionValue<never>) => void;
}

export function defineAsyncState<O>(
  newStateFn: (asyncCtx: AsyncContext, option: O) => CanvasState,
): (option: O) => CanvasState {
  return (option: O) => {
    const resolvers = (Promise as any).withResolvers(); // TODO: Remove "any" when the typing comes.
    const state = newStateFn({ resolve: resolvers.resolve }, option);
    state._resolved = resolvers.promise;
    return state;
  };
}
