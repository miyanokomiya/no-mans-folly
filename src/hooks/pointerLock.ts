import { useCallback, useEffect, useRef, useState } from "react";
import { useGlobalMousemoveEffect } from "./window";
import { IVec2, add, getNorm, multi } from "okageo";
import { MouseOptions, getMouseOptions } from "../utils/devices";

interface PointerLockOption {
  type?: "v" | "h";
  onMove: (args: PointerMoveArgs) => void;
  onEnd?: (args?: PointerMoveArgs) => void;
  onEscape?: (args?: PointerMoveArgs) => void;
}

export type PointerMoveArgs = {
  from: IVec2;
  totalDelta: IVec2;
} & MouseOptions;

export function usePointerLock(option: PointerLockOption) {
  const onMove = option.onMove;
  const onEnd = option.onEnd;
  const onEscape = option.onEscape;
  const type = option.type;

  const [locked, setLocked] = useState(false);
  const [from, setFrom] = useState<IVec2>();
  const totalDelta = useRef<IVec2>({ x: 0, y: 0 });
  const latestPointerMoveArgs = useRef<PointerMoveArgs>(undefined);

  const startLock = useCallback((e: MouseEvent) => {
    e.preventDefault();
    (e.target as Element).requestPointerLock();
    setFrom({ x: e.pageX, y: e.pageY });
    totalDelta.current = { x: 0, y: 0 };
    latestPointerMoveArgs.current = undefined;
    setLocked(true);
  }, []);

  const stopLock = useCallback(() => {
    document.exitPointerLock();
    setLocked(false);
    onEnd?.(latestPointerMoveArgs.current);
  }, [onEnd]);

  const handleMove = useCallback(
    (e: MouseEvent) => {
      if (!locked || !from) return;

      const d = {
        x: type === "v" ? 0 : e.movementX,
        y: type === "h" ? 0 : e.movementY,
      };

      // workaround for Chrome's bug
      // https://stackoverflow.com/questions/24853288/pointer-lock-api-entry-is-giving-a-large-number-when-window-is-squished-why
      if (getNorm(d) > 200) return;

      const options = getMouseOptions(e);
      // make the distance smaller if shift key is pressed
      const adjusted = options.shift ? multi(d, 0.1) : d;
      totalDelta.current = add(totalDelta.current, adjusted);

      const args = { from, totalDelta: totalDelta.current, ...options };
      latestPointerMoveArgs.current = args;
      onMove(args);
    },
    [type, from, onMove, locked],
  );

  useGlobalMousemoveEffect(handleMove);

  const handlePointerlockchange = useCallback(() => {
    if (locked && !document.pointerLockElement) {
      setLocked(false);
      onEscape?.(latestPointerMoveArgs.current);
    }
  }, [locked, onEscape]);

  useEffect(() => {
    if (!locked) return;

    document.addEventListener("pointerlockchange", handlePointerlockchange);
    return () => {
      document.removeEventListener("pointerlockchange", handlePointerlockchange);
    };
  }, [handlePointerlockchange, locked]);

  return [startLock, stopLock, locked] as const;
}
