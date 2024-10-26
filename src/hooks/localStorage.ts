import { useEffect, useMemo, useRef, useState } from "react";
import { newDebounce } from "../utils/stateful/debounce";

type StoredData<T> = {
  version: string;
  value: T;
};

export function useLocalStorageAdopter<T>({
  key,
  version,
  initialValue,
  duration = 1000,
}: {
  key?: string;
  version: string;
  initialValue: T;
  duration?: number;
}) {
  const initialRef = useRef<T>();

  // Restore the value at the first occation without delay.
  if (!initialRef.current) {
    if (key) {
      initialRef.current = getFromLocalStorage<T>(key, version) ?? initialValue;
    } else {
      initialRef.current = initialValue;
    }
  }

  const [state, setState] = useState<T>(initialRef.current);

  const stateRef = useRef(state);
  stateRef.current = state;
  const saveThrottle = useMemo(
    () =>
      newDebounce(() => {
        if (!key) return;
        localStorage.setItem(key, JSON.stringify({ value: stateRef.current, version: version } as StoredData<T>));
      }, duration),
    [key, version, duration],
  );

  useEffect(() => {
    saveThrottle();
  }, [state, saveThrottle]);

  useEffect(() => {
    return () => {
      saveThrottle.flush();
    };
  }, [saveThrottle]);

  return [state, setState] as const;
}

function getFromLocalStorage<T>(key: string, version: string): T | undefined {
  const str = localStorage.getItem(key);
  if (str) {
    const data = JSON.parse(str) as StoredData<T>;
    if (data.version === version) return data.value;
  }
}
