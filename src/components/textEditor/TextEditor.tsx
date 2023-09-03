import { IVec2 } from "okageo";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onInput?: (val: string, composition?: boolean) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  position: IVec2;
  focusKey?: any;
}

export const TextEditor: React.FC<Props> = ({ onInput, onKeyDown, position, focusKey }) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [composition, setComposition] = useState(false);

  useEffect(() => {
    inputRef.current?.focus?.();
  }, [focusKey]);

  const onChange = useCallback(
    (e: any) => {
      if (composition) {
        onInput?.(e.target.value, true);
        setDraft(e.target.value);
      } else {
        onInput?.(e.target.value);
        setDraft("");
      }
    },
    [composition, onInput]
  );

  const onCompositionStart = useCallback(() => {
    setComposition(true);
  }, []);

  const onCompositionEnd = useCallback(() => {
    setComposition(false);
    onInput?.(draft, false);
    setDraft("");
  }, [draft, onInput]);

  return (
    <div
      className="fixed top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      <textarea
        ref={inputRef}
        value={draft}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
      />
    </div>
  );
};
