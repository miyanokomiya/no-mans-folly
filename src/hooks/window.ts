import { useCallback, useEffect, useRef, useState } from "react";
import { Size } from "../models";
import { ModifierOptions } from "../utils/devices";

export function useWindow() {
  const [size, setSize] = useState<Size>({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const fn = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", fn);

    return () => {
      window.removeEventListener("resize", fn);
    };
  }, []);

  return { size };
}

export function useGlobalResizeEffect(fn: () => void) {
  useEffect(() => {
    window.addEventListener("resize", fn);
    fn();
    return () => {
      window.removeEventListener("resize", fn);
    };
  }, [fn]);
}

export function useGlobalClickEffect(fn: (e: MouseEvent) => void, capture = false) {
  useEffect(() => {
    window.addEventListener("click", fn, capture);
    return () => {
      window.removeEventListener("click", fn, capture);
    };
  }, [fn, capture]);
}

export function useGlobalMousemoveEffect(fn: (e: MouseEvent) => void) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const handle = useCallback((e: MouseEvent) => {
    fnRef.current?.(e);
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handle);
    return () => {
      window.removeEventListener("pointermove", handle);
    };
  }, [handle]);
}

export function useGlobalMouseupEffect(fn: (e: MouseEvent) => void) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const handle = useCallback((e: MouseEvent) => {
    fnRef.current?.(e);
  }, []);

  useEffect(() => {
    window.addEventListener("pointerup", handle);
    return () => {
      window.removeEventListener("pointerup", handle);
    };
  }, [handle]);
}

export function useGlobalDrag(onDrag: (e: MouseEvent) => void, onUp: (e: Pick<MouseEvent, "pageX" | "pageY">) => void) {
  const draggingRef = useRef(false);
  const startDragging = useCallback(() => {
    draggingRef.current = true;
  }, []);

  useGlobalMousemoveEffect(
    useCallback(
      (e: MouseEvent) => {
        if (!draggingRef.current) return;
        onDrag(e);
      },
      [onDrag],
    ),
  );

  useGlobalMouseupEffect(
    useCallback(
      (e: MouseEvent) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        onUp(e);
      },
      [onUp],
    ),
  );

  return { startDragging };
}

export function useGlobalKeydownEffect(fn: (e: KeyboardEvent) => void, capture = false) {
  useEffect(() => {
    window.addEventListener("keydown", fn, capture);
    return () => {
      window.removeEventListener("keydown", fn, capture);
    };
  }, [fn, capture]);
}

export function useGlobalCopyEffect(fn: (e: ClipboardEvent) => void) {
  useEffect(() => {
    window.addEventListener("copy", fn);
    return () => {
      window.removeEventListener("copy", fn);
    };
  }, [fn]);
}

export function useGlobalPasteEffect(fn: (e: ClipboardEvent, option: ModifierOptions) => void) {
  const [shift, setShift] = useState(false);

  const _fn = useCallback(
    (e: ClipboardEvent) => {
      fn(e, { shift });
    },
    [fn, shift],
  );

  const trackKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.shiftKey) setShift(true);
  }, []);
  const trackKeyUp = useCallback((e: KeyboardEvent) => {
    if (!e.shiftKey) setShift(false);
  }, []);

  useEffect(() => {
    window.addEventListener("paste", _fn);
    window.addEventListener("keydown", trackKeyDown);
    window.addEventListener("keyup", trackKeyUp);
    return () => {
      window.removeEventListener("paste", _fn);
      window.removeEventListener("keydown", trackKeyDown);
      window.removeEventListener("keyup", trackKeyUp);
    };
  }, [trackKeyDown, trackKeyUp, _fn]);
}

export function useGlobalScroll(fn: (e: Event) => void) {
  useEffect(() => {
    window.addEventListener("scroll", fn, true);
    return () => {
      window.removeEventListener("scroll", fn, true);
    };
  }, [fn]);
}

export function useElementLocation<T extends HTMLElement>(dep: any) {
  const ref = useRef<T>(null);
  const windowSize = useWindow();

  const [overflow, setOverflow] = useState<{ top?: boolean; bottom?: boolean; left?: boolean; right?: boolean }>({});

  const check = useCallback(() => {
    if (!ref.current) return;

    const bounds = ref.current.getBoundingClientRect();
    setOverflow({
      left: bounds.x < 0,
      right: bounds.x + bounds.width > windowSize.size.width,
      top: bounds.y < 0,
      bottom: bounds.y + bounds.height > windowSize.size.height,
    });
  }, [windowSize.size]);

  useEffect(check, [check, dep]);

  return { ref, overflow };
}

export function useOutsideClickCallback<T extends HTMLElement>(fn: () => void) {
  const ref = useRef<T>(null);

  const callback = useCallback(
    (e: MouseEvent) => {
      if (!ref.current || !e.target || ref.current.contains(e.target as Node)) return;
      fn();
    },
    [fn],
  );
  useGlobalClickEffect(callback);

  return { ref };
}

/**
 * This hook cannot be distributed because "window.onbeforeunload" must be set directly.
 * => Make sure not to use this hook simultaneously
 */
export function useUnloadWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const handleUnload = (e: Event) => {
      e.preventDefault();
      e.returnValue = true;
      return true;
    };
    window.onbeforeunload = handleUnload;
    return () => {
      window.onbeforeunload = null;
    };
  }, [active]);
}
