import { useCallback, useMemo, useRef, useState } from "react";
import { TerminologyItem, parseTerminologies } from "../../utils/terminology";
import hintIcon from "../../assets/icons/hint.svg";
import iconDelete from "../../assets/icons/delete_filled.svg";
import { IVec2 } from "okageo";
import { createPortal } from "react-dom";

interface Props {
  children: string;
  className?: string;
  portal?: boolean;
}

export const AppText: React.FC<Props> = ({ children, className, portal }) => {
  const [popup, setPopup] = useState<{ item: TerminologyItem; p: IVec2 } | undefined>(undefined);

  const handleHintActivate = useCallback((item: TerminologyItem, p: IVec2) => {
    setPopup((val) => {
      return val?.item.text === item.text ? undefined : { item, p };
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
  onHintActivate?: (item: TerminologyItem, p: IVec2) => void;
}

const TerminologySpan: React.FC<TerminologySpanProps> = ({ item, activated, onHintActivate }) => {
  const ref = useRef<HTMLElement>(null);

  const handleHintClick = useCallback(
    (e: React.MouseEvent) => {
      // Inert the event in case this component is placed inside an interaction item.
      e.preventDefault();
      e.stopPropagation();

      if (ref.current) {
        const bounds = ref.current.getBoundingClientRect();
        onHintActivate?.(item, { x: bounds.right + 2, y: bounds.top - 12 });
      }
    },
    [item, onHintActivate],
  );

  return (
    <span ref={ref} className="font-bold inline-flex items-center pr-1">
      {item.text}
      <a
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
  p: IVec2;
  portal?: boolean;
  onClose?: () => void;
}

const TerminologyPopup = ({ item, p, portal, onClose }: TerminologyPopupProps): any => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Inert the event in case this component is placed inside an interaction item.
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const elm = (
    <div
      className="p-2 border rounded-xs bg-white shadow-xs fixed max-w-60"
      style={{ left: p.x, top: p.y }}
      onClick={handleClick}
    >
      <h3 className="font-bold text-lg">{item.text}</h3>
      <p className="mt-2">{item.description}</p>
      <button type="button" className="absolute top-1 right-1 w-6 h-6 p-1" onClick={onClose}>
        <img src={iconDelete} alt="Close" />
      </button>
    </div>
  );

  return portal ? createPortal(elm, document.body) : elm;
};
