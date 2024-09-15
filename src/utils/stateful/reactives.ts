export function newCallback<T = undefined>() {
  let callbacks: Array<(...arg: T extends undefined ? [] : [T]) => void> = [];
  function bind(fn: (...arg: T extends undefined ? [] : [T]) => void): () => void {
    callbacks.push(fn);
    return () => {
      callbacks = callbacks.filter((f) => f !== fn);
    };
  }

  function dispatch(...arg: T extends undefined ? [] : [T]) {
    callbacks.forEach((f) => f(...arg));
  }

  return { bind, dispatch };
}
