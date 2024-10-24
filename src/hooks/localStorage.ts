import { useEffect, useMemo, useRef, useState } from "react";
import { newThrottle } from "../utils/stateful/throttle";

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
      newThrottle(
        () => {
          if (!key) return;

          console.log("saved");
          localStorage.setItem(key, JSON.stringify({ value: stateRef.current, version: version } as StoredData<T>));
        },
        duration,
        true,
      ),
    [key, version, duration],
  );

  useEffect(() => {
    saveThrottle();
  }, [state, saveThrottle]);

  return { state, setState };
}

function getFromLocalStorage<T>(key: string, version: string): T | undefined {
  const str = localStorage.getItem(key);
  if (str) {
    const data = JSON.parse(str) as StoredData<T>;
    if (data.version === version) return data.value;
  }
}
