import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TerminologyItem, parseTerminologies } from "../../utils/terminology";
import hintIcon from "../../assets/icons/hint.svg";
import iconDelete from "../../assets/icons/delete_filled.svg";
import { createPortal } from "react-dom";

interface Props {
  children: string;
  className?: string;
  portal?: boolean;
}

export const AppText: React.FC<Props> = ({ children, className, portal }) => {
  const [popup, setPopup] = useState<{ item: TerminologyItem; parentRect: DOMRect } | undefined>(undefined);

  const handleHintActivate = useCallback((item: TerminologyItem, parentRect: DOMRect) => {
    setPopup((val) => {
      return val?.item.text === item.text ? undefined : { item, parentRect };
    });
  }, []);

  const handleHintDeactivate = useCallback(() => {
    setPopup(undefined);
  }, []);

  const elm = useMemo(() => {
    return parseTerminologies(children).map((item, i) => {
      if (!item.description) return item.text;
      return (
        <TerminologySpan key={i} item={item} activated={item === popup?.item} onHintActivate={handleHintActivate} />
      );
    });
  }, [children, popup, handleHintActivate]);

  return (
    <div>
      <div className={className}>{elm}</div>
      {popup ? <TerminologyPopup {...popup} portal={portal} onClose={handleHintDeactivate} /> : undefined}
    </div>
  );
};

interface TerminologySpanProps {
  item: TerminologyItem;
  activated: boolean;
  onHintActivate?: (item: TerminologyItem, parentRect: DOMRect) => void;
}

const TerminologySpan: React.FC<TerminologySpanProps> = ({ item, activated, onHintActivate }) => {
  const ref = useRef<HTMLAnchorElement>(null);

  const handleHintClick = useCallback(
    (e: React.MouseEvent) => {
      // Inert the event in case this component is placed inside an interaction item.
      e.preventDefault();
      e.stopPropagation();

      if (ref.current) {
        const bounds = ref.current.getBoundingClientRect();
        onHintActivate?.(item, bounds);
      }
    },
    [item, onHintActivate],
  );

  return (
    <span className="font-bold inline-flex items-center pr-1">
      {item.text}
      <a
        ref={ref}
        className={
          "rounded-full border ml-1 p-1 cursor-auto hover:bg-emerald-200" +
          (activated ? " bg-emerald-200" : " bg-white")
        }
        onClick={handleHintClick}
      >
        <img src={hintIcon} alt="Hint" className="w-4 h-4" />
      </a>
    </span>
  );
};

interface TerminologyPopupProps {
  item: TerminologyItem;
  parentRect: DOMRect;
  portal?: boolean;
  onClose?: () => void;
}

const TerminologyPopup = ({ item, parentRect, portal, onClose }: TerminologyPopupProps): any => {
  const ref = useRef<HTMLDivElement>(null);
  const [positionH, setPositionH] = useState<"left" | "right">();
  const [positionV, setPositionV] = useState<"top" | "bottom">();

  const style = useMemo(() => {
    // Set initial position at the top-left to get the size of the popup without shrinking.
    if (!positionH || !positionV) return { left: 0, top: 0, opacity: 0 };

    return {
      ...(positionH === "left" ? { right: window.innerWidth - parentRect.right } : { left: parentRect.x }),
      ...(positionV === "top"
        ? { bottom: window.innerHeight - (parentRect.y - 10) }
        : { top: parentRect.y + parentRect.height + 10 }),
    };
  }, [positionH, positionV, parentRect]);

  useEffect(() => {
    if (!ref.current) return;

    const { width, height } = ref.current.getBoundingClientRect();
    const right = parentRect.right + width;
    const bottom = parentRect.bottom + height;
    setPositionH(right > window.innerWidth ? "left" : "right");
    setPositionV(bottom > window.innerHeight ? "top" : "bottom");
  }, [parentRect]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Inert the event in case this component is placed inside an interaction item.
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const elm = (
    <div
      ref={ref}
      className="z-100 p-2 border rounded-xs bg-white shadow-xs fixed max-w-60 select-none touch-none"
      style={style}
      onClick={handleClick}
    >
      <h3 className="font-bold text-lg">{item.text}</h3>
      <p className="mt-2">{item.description}</p>
      <a href="#" className="absolute top-1 right-1 w-6 h-6 p-1" onClick={onClose}>
        <img src={iconDelete} alt="Close" />
      </a>
    </div>
  );

  return portal ? createPortal(elm, document.body) : elm;
};
