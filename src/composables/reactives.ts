export function newCallback() {
  let callbacks: Array<() => void> = [];
  function bind(fn: () => void): () => void {
    callbacks.push(fn);
    return () => {
      callbacks = callbacks.filter((f) => f !== fn);
    };
  }

  function dispatch() {
    callbacks.forEach((f) => f());
  }

  return { bind, dispatch };
}
