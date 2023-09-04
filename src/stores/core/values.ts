import { newCallback } from "../../composables/reactives";

export function newValueStore<T>(initialValue: T) {
  const callback = newCallback();
  const watch = callback.bind;

  let value = initialValue;
  function setValue(val: T) {
    value = val;
    callback.dispatch();
  }

  return {
    watch,
    getValue: () => value,
    setValue,
  };
}
