import { IVec2 } from "okageo";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmojiPicker } from "../molecules/EmojiPicker";
import { EmojiData } from "../../models/document";

interface Props {
  onInput?: (val: string, composition?: boolean) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onKeyUp?: (e: React.KeyboardEvent) => void;
  position: IVec2;
  focusKey?: any;
  showEmojiPicker?: boolean;
  setShowEmojiPicker?: (val: boolean) => void;
}

export const TextEditor: React.FC<Props> = ({
  onInput,
  onKeyDown,
  onKeyUp,
  position,
  focusKey,
  showEmojiPicker,
  setShowEmojiPicker,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(undefined);
  const [draft, setDraft] = useState("");
  const [composition, setComposition] = useState(false);

  useEffect(() => {
    inputRef.current?.focus?.();
  }, [focusKey]);

  // In order to let iOS devices show the keyboard
  // - "focus" has to be called when ref is set.
  // - this function must not be wrapped by "useCallback" for some reason.
  function setTextareaRef(elm: HTMLTextAreaElement) {
    elm?.focus();
    inputRef.current = elm;
  }

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
    [composition, onInput],
  );

  const onCompositionStart = useCallback(() => {
    setComposition(true);
  }, []);

  const onCompositionEnd = useCallback(() => {
    setComposition(false);
    onInput?.(draft, false);
    setDraft("");
  }, [draft, onInput]);

  const handleEmojiSelect = useCallback(
    (val: EmojiData) => {
      onInput?.(val.native);
      setDraft("");
      setShowEmojiPicker?.(false);
      inputRef.current?.focus?.();
    },
    [onInput, setShowEmojiPicker],
  );

  const handleEmojiClickOutside = useCallback(() => {
    setShowEmojiPicker?.(false);
    inputRef.current?.focus?.();
  }, [setShowEmojiPicker]);

  return (
    <>
      <div
        className="fixed top-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      >
        <textarea
          ref={setTextareaRef}
          value={draft}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          autoCapitalize="none"
        />
      </div>
      {showEmojiPicker ? (
        <div
          className="fixed top-0 left-0"
          style={{
            transform: `translate(${position.x + 10}px, ${position.y - 40}px)`,
          }}
        >
          <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={handleEmojiClickOutside} />
        </div>
      ) : undefined}
    </>
  );
};

interface TextEditorEmojiOnlyProps {
  onInput?: (val: string, composition?: boolean) => void;
  position: IVec2;
  setShowEmojiPicker?: (val: boolean) => void;
}

export const TextEditorEmojiOnly: React.FC<TextEditorEmojiOnlyProps> = ({ onInput, position, setShowEmojiPicker }) => {
  const handleEmojiSelect = useCallback(
    (val: EmojiData) => {
      onInput?.(val.native);
      setShowEmojiPicker?.(false);
    },
    [onInput, setShowEmojiPicker],
  );

  const handleEmojiClickOutside = useCallback(() => {
    setShowEmojiPicker?.(false);
  }, [setShowEmojiPicker]);

  return (
    <div
      className="fixed top-0 left-0"
      style={{
        transform: `translate(${position.x + 10}px, ${position.y - 40}px)`,
      }}
    >
      <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={handleEmojiClickOutside} />
    </div>
  );
};
