import { useCallback, useEffect, useRef } from "react";
import iconDelete from "../../assets/icons/delete_filled.svg";

interface Props {
  open: boolean;
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  actions?: React.ReactNode;
}

export const Dialog: React.FC<Props> = ({ open, children, onClose, title, actions }) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    if (open) {
      ref.current.showModal();
    } else if (!open) {
      ref.current.close();
    }
  }, [open]);

  const closeDialog = useCallback(() => {
    onClose();
  }, [onClose]);

  const onClickContent = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
    },
    [onClose]
  );

  return (
    <dialog ref={ref} onClick={closeDialog}>
      <button type="button" className="absolute top-1 right-1 w-6 h-6 p-1" onClick={closeDialog}>
        <img src={iconDelete} alt="Delete Sheet" />
      </button>
      <div onClick={onClickContent} className="p-4">
        {title ? <div className="mb-1 text-lg font-medium">{title}</div> : undefined}
        <div>{children}</div>
        {actions ? <div className="flex justify-end gap-1 mt-4">{actions}</div> : undefined}
      </div>
    </dialog>
  );
};

interface DialogButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
}

export const DialogButtonPlain: React.FC<DialogButtonProps> = ({ onClick, children }) => {
  return (
    <button type="button" className="py-1 px-2 border rounded" onClick={onClick}>
      {children}
    </button>
  );
};

export const DialogButtonAlert: React.FC<DialogButtonProps> = ({ onClick, children }) => {
  return (
    <button type="button" className="py-1 px-2 border rounded bg-red-400 text-white" onClick={onClick}>
      {children}
    </button>
  );
};