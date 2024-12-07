import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGlobalScroll, useWindow } from "../../hooks/window";
import { IRectangle } from "okageo";

export type PopupDirection = "bottom" | "top";

interface Option {
  children: React.ReactNode;
  name: string;
  popup: React.ReactNode;
  opened?: boolean;
  onClick?: (key: string) => void;
  popupPosition?: "bottom" | "right" | "left"; // bottom by default
  defaultDirection?: PopupDirection; // bottom by default
}

export const PopupButton: React.FC<Option> = ({
  children,
  popup,
  name,
  opened,
  onClick,
  popupPosition,
  defaultDirection,
}) => {
  const onButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onClick?.(name);
    },
    [name, onClick],
  );

  const { size: windowSize } = useWindow();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [buttonBounds, setButtonBounds] = useState<IRectangle>();
  const [popupBounds, setPopupBounds] = useState<IRectangle>();

  useEffect(() => {
    if (!buttonRef.current || !popupRef.current || !opened) {
      setPopupBounds(undefined);
    } else {
      setButtonBounds(buttonRef.current.getBoundingClientRect());
      setPopupBounds(popupRef.current.getBoundingClientRect());
    }
  }, [opened]);

  const popupAttrs = useMemo(() => {
    return getPopupAttrs(windowSize.height, buttonBounds, popupBounds, popupPosition, defaultDirection);
  }, [popupPosition, defaultDirection, buttonBounds, popupBounds, windowSize.height]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="border rounded bg-white p-1 flex justify-center items-center"
        onClick={onButtonClick}
      >
        {children}
      </button>
      {opened ? (
        <div ref={popupRef} {...popupAttrs}>
          {popup}
        </div>
      ) : undefined}
    </div>
  );
};

export const FixedPopupButton: React.FC<Option> = ({ children, popup, name, opened, onClick, popupPosition }) => {
  const onButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onClick?.(name);
    },
    [name, onClick],
  );

  const ref = useRef<HTMLDivElement>(null);
  const [boundsState, setBoundsState] = useState<any>();

  const onGlobalScroll = useCallback(() => {
    if (!opened || !ref.current) return;
    setBoundsState({});
  }, [opened]);
  useGlobalScroll(onGlobalScroll);

  const popupAttrs = useMemo(() => {
    if (!ref.current || !opened) return;

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    boundsState; // For exhaustive-deps

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

function getPopupAttrs(
  windowHeight: number,
  buttonBounds?: IRectangle,
  popupBounds?: IRectangle,
  popupPosition?: Option["popupPosition"],
  defaultDirection?: PopupDirection,
) {
  const classBase = "z-10 absolute bg-white border rounded drop-shadow-md ";
  if (!buttonBounds || !popupBounds) {
    // Make invisbile until "popupBounds" is determined.
    return { className: classBase + "invisible " + (defaultDirection === "top" ? "bottom-0" : "") };
  }

  const buttonTop = buttonBounds.y;
  const buttonBottom = buttonTop + buttonBounds.height;
  const toTop = defaultDirection === "top" && 0 < buttonTop - popupBounds.height;
  const toBottom = !toTop && buttonBottom + popupBounds.height < windowHeight;

  // Pick larger room and set max height when the panel is oversized.
  const overHeight = !toTop && !toBottom;
  const adjustedToBottom = overHeight ? buttonTop < windowHeight - buttonBottom : toBottom;
  const heightStyle = overHeight
    ? {
        maxHeight: adjustedToBottom ? windowHeight - buttonBottom : buttonTop,
        overflow: "auto",
      }
    : {};

  switch (popupPosition) {
    case "right":
      return adjustedToBottom
        ? {
            className: classBase + "left-0 top-full",
          }
        : {
            className: classBase + "left-0 bottom-full",
            style: heightStyle,
          };
    case "left":
      return adjustedToBottom
        ? {
            className: classBase + "right-0 top-full",
          }
        : {
            className: classBase + "right-0 bottom-full",
            style: heightStyle,
          };
    default:
      return adjustedToBottom
        ? {
            className: classBase + "left-1/2 bottom-0",
            style: { ...heightStyle, transform: "translate(-50%, 100%)" },
          }
        : {
            className: classBase + "left-1/2 top-0",
            style: { ...heightStyle, transform: "translate(-50%, -100%)" },
          };
  }
}
