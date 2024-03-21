import { useLayoutEffect, useState } from "react";
import { Dialog } from "../atoms/Dialog";

interface Props {
  open: boolean;
}

export const LoadingDialog: React.FC<Props> = ({ open }) => {
  const [opening, setOpening] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;

    setOpening(true);
    const timer = setTimeout(() => {
      setOpening(false);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [open]);

  return (
    <Dialog open={open} hideClose required className={"bg-transparent outline-none" + (opening ? " fade-in" : "")}>
      <div className="p-4 rounded-lg bg-white">{opening ? undefined : <p>Loading...</p>}</div>
    </Dialog>
  );
};
