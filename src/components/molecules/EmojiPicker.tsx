import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useGlobalKeydownEffect } from "../../composables/window";
import { useCallback } from "react";

export interface EmojiData {
  id: string;
  native: string;
}

interface Props {
  onEmojiSelect?: (val: EmojiData) => void;
  onClose?: () => void;
}

export const EmojiPicker: React.FC<Props> = ({ onEmojiSelect, onClose }) => {
  const handleGlobalKeydown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose?.();
    }
  }, []);
  useGlobalKeydownEffect(handleGlobalKeydown, true);

  return (
    <div>
      <Picker data={data} onEmojiSelect={onEmojiSelect} autoFocus={true} onClickOutside={onClose} />
    </div>
  );
};
