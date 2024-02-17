import { useCallback, useEffect, useRef, useState } from "react";

type StoredData<T> = {
  version: string;
  value: T;
};

export function useLocalStorageAdopter<T>(option: { key: string; version: string; initialValue: T }) {
  const initialRef = useRef<T>();

  // Restore the value at the first occation without delay.
  if (!initialRef.current) {
    initialRef.current = getFromLocalStorage<T>(option.key, option.version) ?? option.initialValue;
  }

  const [state, setState] = useState<T>(initialRef.current);

  const save = useCallback(() => {
    localStorage.setItem(option.key, JSON.stringify({ value: state, version: option.version } as StoredData<T>));
  }, [state, option.key, option.version]);

  useEffect(() => {
    save();
  }, [save]);

  return { state, setState };
}

function getFromLocalStorage<T>(key: string, version: string): T | undefined {
  const str = localStorage.getItem(key);
  if (str) {
    const data = JSON.parse(str) as StoredData<T>;
    if (data.version === version) return data.value;
  }
}
