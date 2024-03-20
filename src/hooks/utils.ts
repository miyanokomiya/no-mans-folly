import { useCallback, useEffect, useMemo, useRef } from "react";

export function useEffectOnce(fn: () => (() => void) | void, deactivate = false) {
  const resetRef = useRef(!deactivate);
  useEffect(() => {
    if (!resetRef.current) return;

    resetRef.current = false;
    return fn();
  }, [fn]);

  return useCallback(() => {
    resetRef.current = true;
  }, []);
}

export function useIncrementalKeyMemo(label: string, deps: any[]) {
  const count = useRef(0);
  return useMemo(() => {
    count.current++;
    return `${label}-${count.current}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, ...deps]);
}
