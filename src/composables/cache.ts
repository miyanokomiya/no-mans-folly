import { newThrottle } from "./throttle";

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

/**
 * Each cached value is cleared when it isn't gotten for "duration".
 * Deletion schedule isn't precise.
 */
export function newChronoCache<Key, T>(option: { duration: number; getTimestamp: () => number }) {
  const cache = new Map<Key, { timestamp: number; value: T }>();

  const clearExpiredCacheThrottle = newThrottle(clearExpiredCache, option.duration);

  function getValue(key: Key): T | undefined {
    const item = cache.get(key);
    if (!item) return;

    item.timestamp = option.getTimestamp();
    clearExpiredCacheThrottle();
    return item.value;
  }

  function setValue(key: Key, value: T) {
    cache.set(key, { value, timestamp: option.getTimestamp() });
  }

  function clearExpiredCache() {
    const expired = option.getTimestamp() - option.duration;
    for (const [key, item] of cache) {
      if (item.timestamp < expired) {
        cache.delete(key);
      }
    }
  }

  return { getValue, setValue };
}
