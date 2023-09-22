import { useMemo } from "react";
import { ToastMessage } from "../composables/states/types";
import iconDelete from "../assets/icons/delete_filled.svg";

interface Props {
  messages: ToastMessage[];
  closeToastMessage?: (text: string) => void;
}

export const ToastMessages: React.FC<Props> = ({ messages, closeToastMessage }) => {
  const messageElm = useMemo(() => {
    return messages.map((m) => (
      <div key={m.text} className={"py-2 pl-4 pr-6 rounded shadow relative " + getToastClass(m)}>
        {m.text}
        <button type="button" onClick={() => closeToastMessage?.(m.text)} className="absolute top-0 right-0 w-4 h-4">
          <img src={iconDelete} alt="Close" />
        </button>
      </div>
    ));
  }, [messages, closeToastMessage]);
  return (
    <div className="fixed top-2 left-1/2" style={{ transform: "translateX(-50%)" }}>
      <div className="flex flex-col gap-2">{messageElm}</div>
    </div>
  );
};

function getToastClass(val: ToastMessage): string {
  switch (val.type) {
    case "warn":
      return "bg-yellow-300";
    case "error":
      return "bg-red-300";
    default:
      return "bg-blue-300";
  }
}
