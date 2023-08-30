import { IVec2 } from "okageo";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onInput?: (val: string, composition?: boolean) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  position: IVec2;
}

export const TextEditor: React.FC<Props> = (props) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [composition, setComposition] = useState(false);

  useEffect(() => {
    inputRef.current?.focus?.();
  }, []);

  const onChange = useCallback(
    (e: any) => {
      if (composition) {
        props.onInput?.(e.target.value, true);
        setDraft(e.target.value);
      } else {
        props.onInput?.(e.target.value);
        setDraft("");
      }
    },
    [composition, props]
  );

  const onCompositionStart = useCallback(() => {
    setComposition(true);
  }, []);

  const onCompositionEnd = useCallback(() => {
    setComposition(false);
    props.onInput?.(draft, false);
    setDraft("");
  }, [draft, props]);

  return (
    <div
      className="fixed top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
      style={{
        transform: `translate(${props.position.x}px, ${props.position.y}px)`,
      }}
    >
      <textarea
        ref={inputRef}
        value={draft}
        onChange={onChange}
        onKeyDown={props.onKeyDown}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
      />
    </div>
  );
};
