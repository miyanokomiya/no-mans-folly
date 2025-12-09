import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
        className="border rounded-xs bg-white p-1 flex justify-center items-center"
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

type FixedPopupButtonOption = Omit<Option, "defaultDirection">;

export const FixedPopupButton: React.FC<FixedPopupButtonOption> = ({
  children,
  popup,
  name,
  opened,
  onClick,
  popupPosition,
}) => {
  const onButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onClick?.(name);
    },
    [name, onClick],
  );

  const ref = useRef<HTMLDivElement>(null);
  const refPopup = useRef<HTMLDivElement>(null);
  const [popupAttrs, setPopupAttrs] = useState<{ className: string; style: React.CSSProperties }>();

  const updatePopupAttrs = useCallback(() => {
    if (!ref.current || !opened || !refPopup.current) {
      setPopupAttrs(undefined);
      return;
    }

    const bounds = ref.current.getBoundingClientRect();
    const popupBounds = refPopup.current.getBoundingClientRect();
    const translateY =
      bounds.bottom + popupBounds.height > window.innerHeight ? -bounds.height - popupBounds.height : 0;
    const classBase =
      "z-10 fixed bg-white border rounded-xs drop-shadow-md " + (translateY === undefined ? "opacity-0 " : "");
    const translateAdjustment = translateY ? ` translateY(${translateY}px)` : "";

    switch (popupPosition) {
      case "right":
        setPopupAttrs({
          className: classBase,
          style: { left: bounds.left, top: bounds.bottom, transform: translateAdjustment },
        });
        return;
      case "left":
        setPopupAttrs({
          className: classBase,
          style: { transform: "translateX(-100%)" + translateAdjustment, left: bounds.right, top: bounds.bottom },
        });
        return;
      default:
        setPopupAttrs({
          className: classBase,
          style: {
            transform: "translateX(-50%)" + translateAdjustment,
            left: bounds.left + bounds.width / 2,
            top: bounds.bottom,
          },
        });
        return;
    }
  }, [popupPosition, opened]);
  useGlobalScroll(updatePopupAttrs);
  useEffect(updatePopupAttrs, [updatePopupAttrs]);

  return (
    <div ref={ref}>
      <button
        type="button"
        className="border rounded-xs bg-white p-1 flex justify-center items-center"
        onClick={onButtonClick}
      >
        {children}
      </button>
      {opened
        ? createPortal(
            <div ref={refPopup} {...popupAttrs}>
              {popup}
            </div>,
            document.body,
          )
        : undefined}
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
  const classBase = "z-10 absolute bg-white border rounded-xs drop-shadow-md ";
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
