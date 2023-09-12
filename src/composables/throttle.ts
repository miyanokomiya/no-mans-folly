export function newThrottle<T extends (...args: any[]) => void>(fn: T, interval: number, leading = false) {
  let wait = false;
  let currentArgs: Parameters<T>;

  function throttle(...args: Parameters<T>) {
    currentArgs = args;
    if (wait) return;

    wait = true;

    if (leading) {
      fn(...currentArgs);
    }

    setTimeout(() => {
      if (!leading) {
        fn(...currentArgs);
      }
      wait = false;
    }, interval);
  }

  return throttle;
}
