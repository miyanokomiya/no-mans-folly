import { useEffect, useMemo, useState } from "react";
import { newDebounce } from "../utils/stateful/debounce";

type StoredData<T> = {
  version?: string;
  value: T;
};

export function useLocalStorageAdopter<T>({
  key,
  version,
  initialValue,
  duration = 1000,
}: {
  key?: string;
  version?: string;
  initialValue: T | (() => T);
  duration?: number;
}) {
  const [state, setState] = useState(() => {
    let v = key ? getFromLocalStorage<T>(key, version) : undefined;
    if (v !== undefined) return v;
    return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
  });

  const saveDebounce = useMemo(() => {
    return newDebounce((v: T) => {
      if (!key) return;
      localStorage.setItem(key, JSON.stringify({ value: v, version: version } as StoredData<T>));
    }, duration);
  }, [key, version, duration]);
  useEffect(() => {
    return () => {
      saveDebounce?.flush();
    };
  }, [saveDebounce]);

  useEffect(() => {
    saveDebounce?.(state);
  }, [state, saveDebounce]);

  return [state, setState] as const;
}

function getFromLocalStorage<T>(key: string, version?: string): T | undefined {
  const str = localStorage.getItem(key);
  if (!str) return;

  const data = JSON.parse(str) as StoredData<T>;
  if (data.version === version) return data.value;
}
