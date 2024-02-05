import { newCallback } from "./reactives";

export function newThrottle<T extends (...args: any[]) => void>(fn: T, interval: number, leading = false) {
  let wait: undefined | "wait" | "cooldown";
  let currentArgs: Parameters<T>;
  let timer = 0;

  function throttle(...args: Parameters<T>) {
    currentArgs = args;
    callback.dispatch(true);
    if (wait) {
      wait = "wait";
      return;
    }

    if (leading && !wait) {
      fn(...currentArgs);
      callback.dispatch(false);
      wait = "cooldown";
      tick();
    } else {
      wait = "wait";
      tick();
    }
  }

  function tick() {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = 0;

      if (wait !== "wait") {
        wait = undefined;
        return;
      }

      fn(...currentArgs);
      wait = "cooldown";
      callback.dispatch(false);
      tick();
    }, interval) as any;
  }

  throttle.flush = function () {
    if (timer) {
      clearTimeout(timer);
    }
    timer = 0;

    if (wait === "wait") {
      fn(...currentArgs);
      callback.dispatch(false);
    }
    wait = undefined;
  };

  throttle.clear = function (): boolean {
    if (timer) {
      clearTimeout(timer);
    }
    timer = 0;

    if (wait === "wait") {
      wait = undefined;
      callback.dispatch(false);
      return true;
    }

    wait = undefined;
    return false;
  };

  const callback = newCallback<boolean>();

  throttle.watch = function (fn: (pending: boolean) => void): () => void {
    return callback.bind(fn);
  };

  return throttle;
}
