import { useCallback } from "react";

interface Props {
  onDrop?: (files: FileList) => void;
  children: React.ReactNode;
}

export const FileDropArea: React.FC<Props> = ({ onDrop, children }) => {
  const _onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDrop?.(e.dataTransfer.files);
    },
    [onDrop]
  );
  const _onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div onDrop={_onDrop} onDragOver={_onDragOver}>
      {children}
    </div>
  );
};
