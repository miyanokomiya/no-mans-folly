import { IVec2, add, sub } from "okageo";
import { useCallback, useMemo, useRef, useState } from "react";
import { useGlobalMousemoveEffect, useGlobalMouseupEffect } from "./window";

export function useDraggable() {
  const [dragFrom, setDragFrom] = useState<IVec2>();
  const [dragTo, setDragTo] = useState<IVec2>();
  const [total, setTotal] = useState<IVec2>();
  const vRef = useRef<IVec2>();

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragFrom({ x: e.clientX, y: e.clientY });
  }, []);

  const stopDrag = useCallback(() => {
    const v = vRef.current;
    if (!v) return;

    setTotal((t) => {
      if (v && t) {
        return add(t, v);
      } else {
        return v ?? t;
      }
    });
    vRef.current = undefined;
    setDragFrom(undefined);
    setDragTo(undefined);
  }, []);
  useGlobalMouseupEffect(stopDrag);

  const onMove = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      if (!dragFrom) return;

      const to = { x: e.clientX, y: e.clientY };
      vRef.current = sub(to, dragFrom);
      setDragTo(to);
    },
    [dragFrom],
  );
  useGlobalMousemoveEffect(onMove);

  const currentTotal = useMemo(() => {
    if (dragTo && dragFrom) {
      const v = sub(dragTo, dragFrom);
      return total ? add(total, v) : v;
    } else {
      return total;
    }
  }, [total, dragFrom, dragTo]);

  return {
    v: currentTotal,
    startDrag,
  };
}
