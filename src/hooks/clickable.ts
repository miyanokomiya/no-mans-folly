import { useCallback, useRef } from "react";

interface Props {
  onDown?: (e: PointerEvent) => void;
  onUp?: (e: PointerEvent) => void;
  onClick?: (e: PointerEvent) => void;
  onDoubleClick?: (e: PointerEvent) => void;
}

/**
 * Follows the spec of "PointerDoubleClickEvent" in "src/composables/states/core.ts".
 */
export function useClickable({ onDown, onUp, onClick, onDoubleClick }: Props) {
  const downInfo = useRef<{ timestamp: number; button: number }>(undefined);
  const isDoubleDown = useRef(false);

  // Use the first pointer and ignore others
  const pointerId = useRef<number>(undefined);
  const isValidPointer = useCallback((e: PointerEvent) => {
    return pointerId.current === undefined || pointerId.current === e.pointerId;
  }, []);

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();
      if (!isValidPointer(e)) return;
      pointerId.current = e.pointerId;

      const timestamp = Date.now();
      if (downInfo.current && timestamp - downInfo.current.timestamp < 300 && e.button === downInfo.current.button) {
        e.preventDefault();
        downInfo.current = undefined;
        isDoubleDown.current = true;
      } else {
        downInfo.current = { timestamp, button: e.button };
        isDoubleDown.current = false;
        onDown?.(e);
      }
    },
    [onDown, isValidPointer],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();
      if (!isValidPointer(e)) return;
      pointerId.current = undefined;

      if (isDoubleDown.current) {
        e.preventDefault();
        isDoubleDown.current = false;
        onDoubleClick?.(e);
      } else {
        onUp?.(e);
        onClick?.(e);
      }
    },
    [onUp, onClick, onDoubleClick, isValidPointer],
  );

  return {
    handlePointerDown,
    handlePointerUp,
    isValidPointer,
  };
}
