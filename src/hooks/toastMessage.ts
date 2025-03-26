import { useCallback, useEffect, useRef, useState } from "react";
import { ToastMessage } from "../composables/states/types";
import { pickMinItem } from "../utils/commons";

interface Option {
  timeout?: number;
}

export function useToastMessages(option?: Option) {
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);
  const timers = useRef(new Map<string, number>());

  const pushToastMessage = useCallback(
    (val: ToastMessage) => {
      setToastMessages((current) => {
        return [...current.filter((c) => c.text !== val.text), val];
      });

      if (val.type === "info" || val.timeout) {
        timers.current.set(val.text, Date.now() + (val.timeout ?? option?.timeout ?? 3000));
      }
    },
    [option?.timeout],
  );

  const closeToastMessage = useCallback((text: string) => {
    setToastMessages((current) => {
      return current.filter((c) => c.text !== text);
    });
    timers.current.delete(text);
  }, []);

  useEffect(() => {
    if (timers.current.size === 0) return;

    const target = pickMinItem(Array.from(timers.current.entries()), (v) => v[1])!;
    const duration = target[1] - Date.now();
    if (duration <= 0) {
      closeToastMessage(target[0]);
      return;
    }

    const timer = setInterval(() => {
      closeToastMessage(target[0]);
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [toastMessages, closeToastMessage]);

  return { toastMessages, closeToastMessage, pushToastMessage };
}
