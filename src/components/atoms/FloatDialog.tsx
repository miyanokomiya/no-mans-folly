import { useCallback, useEffect, useRef, useState } from "react";
import iconDelete from "../../assets/icons/delete_filled.svg";
import { AppText } from "../molecules/AppText";
import { add, clamp, IVec2, sub } from "okageo";
import { useGlobalDrag, useWindow } from "../../hooks/window";
import { Size } from "../../models";
import { useLocalStorageAdopter } from "../../hooks/localStorage";

const ZERO_V = { x: 0, y: 0 };
const INITIAL_SIZE = { width: 400, height: 400 };
const MIN_SIZE = 200;

interface Props {
  open: boolean;
  children: React.ReactNode;
  initialPosition?: IVec2;
  initialSize?: Size;
  onClose?: () => void;
  title?: string;
  className?: string;
  boundsKey?: string;
}

export const FloatDialog: React.FC<Props> = ({
  open,
  children,
  initialPosition = ZERO_V,
  initialSize = INITIAL_SIZE,
  onClose,
  title,
  className,
  boundsKey,
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  const { size: windowSize } = useWindow();
  const { state: position, setState: setPosition } = useLocalStorageAdopter({
    key: boundsKey ? `float-dialog_${boundsKey}_position` : "",
    version: "1",
    initialValue: initialPosition,
  });
  const { state: bodySize, setState: setBodySize } = useLocalStorageAdopter({
    key: boundsKey ? `float-dialog_${boundsKey}_size` : "",
    version: "1",
    initialValue: initialSize,
  });
  const [dragFrom, setDragFrom] = useState<{ from: IVec2; data: IVec2 }>();

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
  }, [windowSize, setPosition]);

  const { startDragging } = useGlobalDrag(
    useCallback(
      (e: PointerEvent) => {
        if (!dragFrom || !ref.current) return;

        const bounds = ref.current.getBoundingClientRect();
        const v = sub({ x: e.clientX, y: e.clientY }, dragFrom.from);
        const draft = add(dragFrom.data, v);
        const x = clamp(0, windowSize.width - bounds.width, draft.x);
        const y = clamp(0, windowSize.height - bounds.height, draft.y);
        setPosition({ x, y });
      },
      [dragFrom, windowSize, setPosition],
    ),
    useCallback(() => {
      setDragFrom(undefined);
    }, []),
  );

  const handleDown = useCallback(
    (e: React.PointerEvent) => {
      setDragFrom({ from: { x: e.clientX, y: e.clientY }, data: position });
      startDragging();
    },
    [startDragging, position],
  );

  const bodyRef = useRef<HTMLDivElement>(null);
  const { startDragging: startResizeDragging } = useGlobalDrag(
    useCallback(
      (e: PointerEvent) => {
        if (!dragFrom || !bodyRef.current) return;

        const bounds = bodyRef.current.getBoundingClientRect();
        const v = sub({ x: e.clientX, y: e.clientY }, dragFrom.from);
        const draft = add(dragFrom.data, v);
        const w = clamp(MIN_SIZE, windowSize.width - bounds.x, draft.x);
        const h = clamp(MIN_SIZE, windowSize.height - bounds.y, draft.y);
        setBodySize({ width: w, height: h });
      },
      [dragFrom, windowSize, setBodySize],
    ),
    useCallback(() => {
      setDragFrom(undefined);
    }, []),
  );

  const handleBodyDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragFrom({ from: { x: e.clientX, y: e.clientY }, data: { x: bodySize.width, y: bodySize.height } });
      startResizeDragging();
    },
    [startResizeDragging, bodySize],
  );

  const bodyStyle: React.CSSProperties = {
    width: bodySize.width,
    height: bodySize.height,
  };

  return (
    <dialog ref={ref} className={"border-2 shadow rounded " + className} style={positionStyle}>
      <div
        className="px-1 border rounded bg-gray-200 flex items-center cursor-move select-none"
        onPointerDown={handleDown}
      >
        {title ? <AppText className="text-lg font-medium">{title}</AppText> : undefined}
        <button type="button" className="ml-auto w-6 h-6 p-1" onClick={closeDialog}>
          <img src={iconDelete} alt="Close" />
        </button>
      </div>
      <div ref={bodyRef} className="relative overflow-hidden" style={bodyStyle}>
        {children}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize overflow-hidden"
          onPointerDown={handleBodyDown}
        >
          <div className="border-t border-black -rotate-45 w-6 absolute bottom-2" />
          <div className="border-t border-black -rotate-45 w-6 absolute bottom-0.5" />
        </div>
      </div>
    </dialog>
  );
};