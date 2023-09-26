import { newCallback } from "./reactives";

export function newThrottle<T extends (...args: any[]) => void>(fn: T, interval: number, leading = false) {
  let wait = false;
  let currentArgs: Parameters<T>;
  let timer = 0;

  function throttle(...args: Parameters<T>) {
    currentArgs = args;
    callback.dispatch(true);
    if (wait) return;

    wait = true;

    if (leading) {
      fn(...currentArgs);
      callback.dispatch(false);
    }

    timer = setTimeout(() => {
      if (!leading) {
        fn(...currentArgs);
      }
      wait = false;
      timer = 0;
      callback.dispatch(false);
    }, interval) as any;
  }

  throttle.flush = function () {
    if (timer) {
      clearTimeout(timer);
    }

    if (wait) {
      fn(...currentArgs);
      wait = false;
      timer = 0;
      callback.dispatch(false);
    }
  };

  throttle.clear = function (): boolean {
    if (timer) {
      clearTimeout(timer);
    }

    if (wait) {
      wait = false;
      timer = 0;
      callback.dispatch(false);
      return true;
    }

    return false;
  };

  const callback = newCallback<boolean>();

  throttle.watch = function (fn: (pending: boolean) => void): () => void {
    return callback.bind(fn);
  };

  return throttle;
}
