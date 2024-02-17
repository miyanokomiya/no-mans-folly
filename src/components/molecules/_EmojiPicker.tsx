import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useGlobalKeydownEffect } from "../../hooks/window";
import { useCallback } from "react";
import { EmojiData } from "../../models/document";

interface Props {
  onEmojiSelect?: (val: EmojiData) => void;
  onClose?: () => void;
}

/**
 * Don't use this component directly to reduce initial bundle size.
 * Use "EmojiPicker.tsx" instead.
 */
const _EmojiPicker: React.FC<Props> = ({ onEmojiSelect, onClose }) => {
  const handleGlobalKeydown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    },
    [onClose],
  );
  useGlobalKeydownEffect(handleGlobalKeydown, true);

  return (
    <div>
      <Picker data={data} onEmojiSelect={onEmojiSelect} autoFocus={true} onClickOutside={onClose} />
    </div>
  );
};
export default _EmojiPicker;
