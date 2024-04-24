import { useCallback } from "react";

interface Props {
  onDrop?: (e: React.DragEvent) => void;
  typeRegs: RegExp[]; // Only one type that hits first is used.
  children: React.ReactNode;
}

export const FileDropArea: React.FC<Props> = ({ onDrop, children, typeRegs }) => {
  const _onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const files = e.dataTransfer.files;
      if (files.length === 0) return;

      const typeReg = typeRegs.find((reg) => reg.test(files[0].type));
      if (!typeReg) return;

      for (const file of e.dataTransfer.files) {
        if (!typeReg.test(file.type)) {
          return;
        }
      }

      onDrop?.(e);
    },
    [onDrop, typeRegs],
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
