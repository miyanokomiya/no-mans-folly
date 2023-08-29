import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onInput?: (val: string) => void;
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
    props.onInput?.(draft);
    setDraft("");
  }, [draft, props]);

  return (
    <div className="fixed top-0 left-0">
      <textarea
        ref={inputRef}
        type="text"
        value={draft}
        onChange={onChange}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
      />
    </div>
  );
};
