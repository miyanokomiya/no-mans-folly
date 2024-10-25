import { newCallback } from "./reactives";

export function newDebounce<T extends (...args: any[]) => void>(fn: T, interval: number) {
  let currentArgs: Parameters<T>;
  let timer = 0;
  const callback = newCallback<boolean>();

  function debounce(...args: Parameters<T>) {
    currentArgs = args;
    callback.dispatch(true);

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = 0;
      fn(...currentArgs);
      callback.dispatch(false);
    }, interval) as any;
  }

  debounce.flush = function () {
    if (timer) {
      clearTimeout(timer);
      fn(...currentArgs);
      callback.dispatch(false);
      timer = 0;
    }
  };

  debounce.clear = function () {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
  };

  debounce.watch = function (fn: (pending: boolean) => void): () => void {
    return callback.bind(fn);
  };

  return debounce;
}
