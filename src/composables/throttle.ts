export function newThrottle<T extends (...args: any[]) => void>(fn: T, interval: number, leading = false) {
  let wait = false;
  let currentArgs: Parameters<T>;
  let timer = 0;

  function throttle(...args: Parameters<T>) {
    currentArgs = args;
    if (wait) return;

    wait = true;

    if (leading) {
      fn(...currentArgs);
    }

    timer = setTimeout(() => {
      if (!leading) {
        fn(...currentArgs);
      }
      wait = false;
      timer = 0;
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
    }
  };

  throttle.clear = function (): boolean {
    if (timer) {
      clearTimeout(timer);
    }

    if (wait) {
      wait = false;
      timer = 0;
      return true;
    }

    return false;
  };

  return throttle;
}
