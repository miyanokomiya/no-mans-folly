import { useEffect, useState } from "react";
import { Size } from "../models";

export function useWindow() {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  window.addEventListener("resize", () => {
    setSize({ width: window.innerWidth, height: window.innerHeight });
  });

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
