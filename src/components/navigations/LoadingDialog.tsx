import { useLayoutEffect, useState } from "react";
import { Dialog } from "../atoms/Dialog";

interface Props {
  open: boolean;
  progress?: number; // 0 to 1
}

export const LoadingDialog: React.FC<Props> = ({ open, progress }) => {
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

  const content = opening ? undefined : progress === undefined ? (
    <p>Loading...</p>
  ) : (
    <div className="w-60 rounded-xs border bg-white flex justify-start">
      <div
        className="h-4 w-full rounded-xs bg-lime-300 transition-transform"
        style={{
          transform: `scaleX(${progress})`,
          transformOrigin: "left center",
        }}
      ></div>
    </div>
  );

  return (
    <Dialog open={open} hideClose required className={"bg-transparent outline-hidden" + (opening ? " fade-in" : "")}>
      <div className="p-4 rounded-lg bg-white">{content}</div>
    </Dialog>
  );
};
