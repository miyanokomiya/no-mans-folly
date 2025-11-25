// Overload for no generic parameter - callbacks take no arguments
export function newCallback(): {
  bind(fn: () => void): () => void;
  unbind(fn: () => void): void;
  dispatch(): void;
};
// Overload for generic parameter - callbacks take one argument of type T
export function newCallback<T>(): {
  bind(fn: (arg: T) => void): () => void;
  unbind(fn: (arg: T) => void): void;
  dispatch(arg: T): void;
};
export function newCallback<T = undefined>() {
  let callbacks: Array<T extends undefined ? () => void : (arg: T) => void> = [];

  function bind(fn: T extends undefined ? () => void : (arg: T) => void): () => void {
    callbacks.push(fn);
    return () => {
      unbind(fn);
    };
  }

  function unbind(fn: T extends undefined ? () => void : (arg: T) => void) {
    callbacks = callbacks.filter((f) => f !== fn);
  }

  function dispatch(...args: T extends undefined ? [] : [T]) {
    if (args.length === 0) {
      (callbacks as Array<() => void>).forEach((f) => f());
    } else {
      (callbacks as Array<(arg: T) => void>).forEach((f) => f(args[0]));
    }
  }

  return { bind, unbind, dispatch };
}
