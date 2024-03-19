import { useCallback, useEffect, useRef } from "react";

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
