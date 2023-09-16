import { useCallback, useMemo, useRef, useState } from "react";
import { useGlobalScroll } from "../../composables/window";

interface Option {
  children: React.ReactNode;
  name: string;
  popup: React.ReactNode;
  opened?: boolean;
  onClick?: (key: string) => void;
  popupPosition?: "bottom" | "right" | "left";
}

export const PopupButton: React.FC<Option> = ({ children, popup, name, opened, onClick, popupPosition }) => {
  const onButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onClick?.(name);
    },
    [name, onClick]
  );

  const popupAttrs = useMemo(() => {
    const classBase = "z-10 absolute bg-white border rounded drop-shadow-md ";
    switch (popupPosition) {
      case "right":
        return {
          className: classBase + "left-0 top-full",
          style: {},
        };
      case "left":
        return {
          className: classBase + "right-0 top-full",
          style: {},
        };
      default:
        return {
          className: classBase + "left-1/2 bottom-0",
          style: { transform: "translate(-50%, 100%)" },
        };
    }
  }, [popupPosition]);

  return (
    <div className="relative">
      <button
        type="button"
        className="border rounded bg-white p-1 flex justify-center items-center"
        onClick={onButtonClick}
      >
        {children}
      </button>
      {opened ? <div {...popupAttrs}>{popup}</div> : undefined}
    </div>
  );
};

export const FixedPopupButton: React.FC<Option> = ({ children, popup, name, opened, onClick, popupPosition }) => {
  const onButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onClick?.(name);
    },
    [name, onClick]
  );

  const ref = useRef<HTMLDivElement>(null);
  const [boundsState, setBoundsState] = useState<any>();

  const onGlobalScroll = useCallback(() => {
    if (!opened || !ref.current) return;
    setBoundsState({});
  }, [opened]);
  useGlobalScroll(onGlobalScroll);

  const popupAttrs = useMemo(() => {
    if (!ref.current) return {};

    const bounds = ref.current.getBoundingClientRect();
    const classBase = "z-10 fixed bg-white border rounded p-2 drop-shadow-md ";
    switch (popupPosition) {
      case "right":
        return {
          className: classBase,
          style: { left: bounds.left, top: bounds.bottom },
        };
      case "left":
        return {
          className: classBase,
          style: { transform: "translateX(-100%)", left: bounds.right, top: bounds.bottom },
        };
      default:
        return {
          className: classBase,
          style: { transform: "translateX(-50%)", left: bounds.left + bounds.width / 2, top: bounds.bottom },
        };
    }
  }, [popupPosition, opened, boundsState]);

  return (
    <div ref={ref}>
      <button
        type="button"
        className="border rounded bg-white p-1 flex justify-center items-center"
        onClick={onButtonClick}
      >
        {children}
      </button>
      {opened ? <div {...popupAttrs}>{popup}</div> : undefined}
    </div>
  );
};
