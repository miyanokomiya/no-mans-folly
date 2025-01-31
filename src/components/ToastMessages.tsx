import { useEffect, useMemo, useState } from "react";
import { ToastMessage } from "../composables/states/types";
import iconDelete from "../assets/icons/delete_filled.svg";

interface Props {
  messages: ToastMessage[];
  closeToastMessage?: (text: string) => void;
}

export const ToastMessages: React.FC<Props> = ({ messages, closeToastMessage }) => {
  const messageElm = useMemo(() => {
    return messages.map((m) => <ToastItem key={m.text} {...m} closeToastMessage={closeToastMessage} />);
  }, [messages, closeToastMessage]);
  return (
    <div className="z-50 fixed top-2 left-1/2" style={{ transform: "translateX(-50%)" }}>
      <div className="flex flex-col gap-2">{messageElm}</div>
    </div>
  );
};

interface ToastItemProps extends ToastMessage {
  closeToastMessage?: (text: string) => void;
}

export const ToastItem: React.FC<ToastItemProps> = ({ text, type, closeToastMessage }) => {
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFade(false);
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      className={
        "min-w-40 pl-4 rounded-xs shadow-xs flex items-center justify-between transition-all " +
        (fade ? "-translate-y-20 opacity-0 " : "") +
        getToastClass(type)
      }
    >
      <span className="py-2">{text}</span>
      <button
        type="button"
        onClick={() => closeToastMessage?.(text)}
        className="w-8 h-8 p-1 flex items-center justify-center"
      >
        <img src={iconDelete} alt="Close" className="w-4 h-4" />
      </button>
    </div>
  );
};

function getToastClass(type: ToastMessage["type"]): string {
  switch (type) {
    case "warn":
      return "bg-yellow-300";
    case "error":
      return "bg-red-300";
    default:
      return "bg-blue-300";
  }
}
