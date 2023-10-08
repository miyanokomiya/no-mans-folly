import { useCallback, useEffect, useRef, useState } from "react";
import { Size } from "../models";
import { ModifierOptions } from "./states/types";

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

export function useGlobalScrollEffect(fn: () => void, capture = false) {
  useEffect(() => {
    window.addEventListener("scroll", fn, capture);
    return () => {
      window.removeEventListener("scroll", fn, capture);
    };
  }, [fn, capture]);
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
  useEffect(() => {
    window.addEventListener("mousemove", fn);
    return () => {
      window.removeEventListener("mousemove", fn);
    };
  }, [fn]);
}

export function useGlobalMouseupEffect(fn: (e: MouseEvent) => void) {
  useEffect(() => {
    window.addEventListener("mouseup", fn);
    window.addEventListener("mouseleave", fn);
    return () => {
      window.removeEventListener("mouseup", fn);
      window.removeEventListener("mouseleave", fn);
    };
  }, [fn]);
}

export function useGlobalKeydownEffect(fn: (e: KeyboardEvent) => void) {
  useEffect(() => {
    window.addEventListener("keydown", fn);
    return () => {
      window.removeEventListener("keydown", fn);
    };
  }, [fn]);
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
