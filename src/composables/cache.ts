export function newCache<T>(resetValue: () => T) {
  let value: T;
  let isDirty = true;

  function getValue(): T {
    if (isDirty) {
      value = resetValue();
      isDirty = false;
    }
    return value;
  }

  function update() {
    isDirty = true;
  }

  return {
    update,
    getValue,
  };
}
