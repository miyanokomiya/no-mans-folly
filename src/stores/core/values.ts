import { newCallback } from "../../utils/stateful/reactives";

export function newValueStore<T>(initialValue: T) {
  const callback = newCallback<T | undefined>();
  const watch = callback.bind;

  let value = initialValue;
  function setValue(val: T) {
    value = val;
    callback.dispatch(val);
  }

  return {
    watch,
    getValue: () => value,
    setValue,
  };
}
