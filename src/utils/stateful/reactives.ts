export function newCallback<T = undefined>() {
  let callbacks: Array<(...arg: T extends undefined ? [] : [T]) => void> = [];
  function bind(fn: (...arg: T extends undefined ? [] : [T]) => void): () => void {
    callbacks.push(fn);
    return () => {
      unbind(fn);
    };
  }

  function unbind(fn: any) {
    callbacks = callbacks.filter((f) => f !== fn);
  }

  function dispatch(...arg: T extends undefined ? [] : [T]) {
    callbacks.forEach((f) => f(...arg));
  }

  return { bind, unbind, dispatch };
}
