import { IVec2, add, sub } from "okageo";
import { useCallback, useMemo, useRef, useState } from "react";
import { useGlobalDrag } from "./window";

export function useDraggable() {
  const [dragFrom, setDragFrom] = useState<IVec2>();
  const [dragTo, setDragTo] = useState<IVec2>();
  const [total, setTotal] = useState<IVec2>();
  const vRef = useRef<IVec2>(undefined);

  const { startDragging } = useGlobalDrag(
    useCallback(
      (e: PointerEvent) => {
        if (!dragFrom) return;

        e.preventDefault();
        const to = { x: e.clientX, y: e.clientY };
        vRef.current = sub(to, dragFrom);
        setDragTo(to);
      },
      [dragFrom],
    ),
    useCallback(() => {
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
    }, []),
  );

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragFrom({ x: e.clientX, y: e.clientY });
      startDragging();
    },
    [startDragging],
  );

  const clear = useCallback(() => {
    setDragFrom(undefined);
    setDragTo(undefined);
    setTotal(undefined);
    vRef.current = undefined;
  }, []);

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
    clear,
  };
}
