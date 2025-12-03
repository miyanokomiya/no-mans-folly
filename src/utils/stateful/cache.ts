import { newCallback } from "./reactives";
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

export function newCacheWithArg<T, K>(resetValue: (k: K) => T) {
  let value: T;
  let isDirty = true;

  function getValue(k: K): T {
    if (isDirty) {
      value = resetValue(k);
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

export type ChronoCacheMap<Key, T> = Map<Key, { timestamp: number; value: T }>;

/**
 * "getCacheMap" always returns the same map instance.
 */
export type ChronoCache<Key, T> = {
  getCacheMap: () => ChronoCacheMap<Key, T>;
  getValue: (key: Key) => T | undefined;
  setValue: (key: Key, value: T) => void;
  deleteValue: (key: Key) => void;
  watch: (fn: () => void) => () => void;
};

/**
 * Each cached value is cleared when it isn't gotten for "duration".
 * Deletion schedule isn't precise.
 */
export function newChronoCache<Key, T>(option: { duration: number; getTimestamp: () => number }): ChronoCache<Key, T> {
  const cache: ChronoCacheMap<Key, T> = new Map();
  const clearExpiredCacheThrottle = newThrottle(clearExpiredCache, option.duration);
  const callback = newCallback();

  function getValue(key: Key): T | undefined {
    const item = cache.get(key);
    if (!item) return;

    item.timestamp = option.getTimestamp();
    clearExpiredCacheThrottle();
    return item.value;
  }

  function setValue(key: Key, value: T) {
    cache.set(key, { value, timestamp: option.getTimestamp() });
    callback.dispatch();
    clearExpiredCacheThrottle();
  }

  function deleteValue(key: Key) {
    if (cache.has(key)) {
      cache.delete(key);
      callback.dispatch();
    }
    clearExpiredCacheThrottle();
  }

  function clearExpiredCache() {
    const expired = option.getTimestamp() - option.duration;
    let changed = false;
    for (const [key, item] of cache) {
      if (item.timestamp < expired) {
        cache.delete(key);
        changed = true;
      }
    }

    if (changed) {
      callback.dispatch();
    }
  }

  function getCacheMap() {
    clearExpiredCacheThrottle();
    return cache;
  }

  return { getCacheMap, getValue, setValue, deleteValue, watch: callback.bind };
}

export function newObjectWeakCache<K extends object, T extends object>() {
  const cacheMap = new WeakMap<K, Partial<T>>();

  function getValue<V>(obj: K, key: keyof T, getFn: () => V): V {
    const cache = cacheMap.get(obj);
    if (cache) {
      const v = cache[key];
      if (v) return v as V;

      const newV = getFn();
      cache[key] = newV as any;
      return newV;
    } else {
      const newV = getFn();
      cacheMap.set(obj, { [key]: newV } as any);
      return newV;
    }
  }

  return {
    getValue,
  };
}
