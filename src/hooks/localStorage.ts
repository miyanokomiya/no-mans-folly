import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Debounce, newDebounce } from "../utils/stateful/debounce";

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
  const [state, setState] = useState(initialValue);
  const [saveDebounce, setSaveDebounce] = useState<Debounce>();
  const stateRef = useRef(state);

  // Retrieve the value from the storage at first.
  useLayoutEffect(() => {
    if (!key) return;

    const storedValue = getFromLocalStorage<T>(key, version);
    if (storedValue) {
      setState(storedValue);
    }
  }, [key, version]);

  // Let the debounce function always see the latest state value without depending on it.
  useEffect(() => {
    const debounce = newDebounce(() => {
      if (!key) return;
      localStorage.setItem(key, JSON.stringify({ value: stateRef.current, version: version } as StoredData<T>));
    }, duration);
    setSaveDebounce(() => debounce);
  }, [key, version, duration]);

  useEffect(() => {
    stateRef.current = state;
    saveDebounce?.();
  }, [state, saveDebounce]);

  useEffect(() => {
    return () => {
      saveDebounce?.flush();
    };
  }, [saveDebounce]);

  return [state, setState] as const;
}

function getFromLocalStorage<T>(key: string, version?: string): T | undefined {
  const str = localStorage.getItem(key);
  if (str) {
    const data = JSON.parse(str) as StoredData<T>;
    if (data.version === version) return data.value;
  }
}
