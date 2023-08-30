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
      className="fixed opacity-0 pointer-events-none"
      style={{
        top: props.position.y,
        bottom: props.position.y + 1,
        left: props.position.x,
        right: props.position.x + 1,
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
