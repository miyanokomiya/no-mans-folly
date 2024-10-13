import { useCallback, useEffect, useRef, useState } from "react";
import iconDelete from "../../assets/icons/delete_filled.svg";
import { AppText } from "../molecules/AppText";
import { add, clamp, IVec2, sub } from "okageo";
import { useGlobalDrag, useWindow } from "../../hooks/window";
import { Size } from "../../models";

const ZERO_V = { x: 0, y: 0 };

interface Props {
  open: boolean;
  children: React.ReactNode;
  initialPosition?: IVec2;
  initialSize?: Size;
  onClose?: () => void;
  title?: string;
  className?: string;
}

export const FloatDialog: React.FC<Props> = ({
  open,
  children,
  initialPosition = ZERO_V,
  initialSize,
  onClose,
  title,
  className,
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const { size: windowSize } = useWindow();
  const [position, setPosition] = useState<IVec2>(initialPosition);
  const [dragFrom, setDragFrom] = useState<{ from: IVec2; position: IVec2 }>();

  const positionStyle: React.CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y,
    margin: 0,
    zIndex: 100,
  };

  useEffect(() => {
    if (!ref.current) return;

    if (open) {
      ref.current.show();
    } else if (!open) {
      ref.current.close();
    }
  }, [open]);

  const closeDialog = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!ref.current) return;

    const bounds = ref.current.getBoundingClientRect();
    const x = clamp(0, windowSize.width - bounds.width, bounds.x);
    const y = clamp(0, windowSize.height - bounds.height, bounds.y);
    if (x === bounds.x && y === bounds.y) return;

    setPosition({ x, y });
  }, [windowSize]);

  const { startDragging } = useGlobalDrag(
    useCallback(
      (e: PointerEvent) => {
        if (!dragFrom || !ref.current) return;

        const bounds = ref.current.getBoundingClientRect();
        const v = sub({ x: e.clientX, y: e.clientY }, dragFrom.from);
        const draft = add(dragFrom.position, v);
        const x = clamp(0, windowSize.width - bounds.width, draft.x);
        const y = clamp(0, windowSize.height - bounds.height, draft.y);
        setPosition({ x, y });
      },
      [dragFrom, windowSize],
    ),
    useCallback(() => {
      setDragFrom(undefined);
    }, []),
  );

  const handleDown = useCallback(
    (e: React.PointerEvent) => {
      setDragFrom({ from: { x: e.clientX, y: e.clientY }, position });
      startDragging();
    },
    [startDragging, position],
  );

  const bodyStyle: React.CSSProperties = initialSize
    ? {
        width: initialSize.width,
        height: initialSize.height,
      }
    : {};

  return (
    <dialog ref={ref} className={"border shadow rounded " + className} style={positionStyle}>
      <div
        className="px-1 border rounded bg-gray-200 flex items-center cursor-move select-none"
        onPointerDown={handleDown}
      >
        {title ? <AppText className="text-lg font-medium">{title}</AppText> : undefined}
        <button type="button" className="ml-auto w-6 h-6 p-1" onClick={closeDialog}>
          <img src={iconDelete} alt="Close" />
        </button>
      </div>
      <div className="resize overflow-auto" style={bodyStyle}>
        {children}
      </div>
    </dialog>
  );
};
