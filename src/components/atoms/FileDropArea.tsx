import { useCallback } from "react";

interface Props {
  onDrop?: (e: React.DragEvent) => void;
  typeReg: RegExp;
  children: React.ReactNode;
}

export const FileDropArea: React.FC<Props> = ({ onDrop, children, typeReg }) => {
  const _onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      for (const file of e.dataTransfer.files) {
        if (!typeReg.test(file.type)) {
          return;
        }
      }

      onDrop?.(e);
    },
    [onDrop, typeReg],
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
