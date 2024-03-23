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
  const downInfo = useRef<{ timestamp: number; button: number }>();
  const isDoubleDown = useRef(false);
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
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
    [onDown],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (isDoubleDown.current) {
        e.preventDefault();
        isDoubleDown.current = false;
        onDoubleClick?.(e);
      } else {
        onUp?.(e);
        onClick?.(e);
      }
    },
    [onUp, onClick, onDoubleClick],
  );

  return {
    handlePointerDown,
    handlePointerUp,
  };
}
