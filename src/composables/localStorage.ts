import { useCallback, useEffect, useState } from "react";

type StoredData<T> = {
  version: string;
  value: T;
};

export function useLocalStorageAdopter<T>(option: { key: string; version: string; initialValue: T }) {
  const [state, setState] = useState(option.initialValue);

  const save = useCallback(() => {
    if (state === option.initialValue) return;
    localStorage.setItem(option.key, JSON.stringify({ value: state, version: option.version } as StoredData<T>));
  }, [state, option.key, option.version, option.initialValue]);

  const restore = useCallback(() => {
    const str = localStorage.getItem(option.key);
    if (str) {
      const data = JSON.parse(str) as StoredData<T>;
      if (data.version === option.version) setState(data.value);
    }
  }, [option.key, option.version]);

  useEffect(() => {
    restore();
  }, [restore, option.key, option.version]);

  useEffect(() => {
    save();
  }, [save]);

  return { state, setState };
}
