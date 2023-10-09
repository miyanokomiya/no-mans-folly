import { Suspense, lazy } from "react";
import { EmojiData } from "../../models/document";

const LazyEmojiPicker = lazy(() => import("./_EmojiPicker"));

interface Props {
  onEmojiSelect?: (val: EmojiData) => void;
  onClose?: () => void;
}

export const EmojiPicker: React.FC<Props> = ({ onEmojiSelect, onClose }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyEmojiPicker onEmojiSelect={onEmojiSelect} onClose={onClose} />
    </Suspense>
  );
};
