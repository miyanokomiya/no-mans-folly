import { useCallback, useRef } from "react";
import { useLocalStorageAdopter } from "../../hooks/localStorage";
import iconDropdown from "../../assets/icons/dropdown.svg";

interface Props {
  label: string;
  children?: React.ReactNode;
  accordionKey?: string;
}

export const BlockGroupField: React.FC<Props> = ({ label, children, accordionKey }) => {
  const [accordionState, setAccordingState] = useLocalStorageAdopter({
    key: accordionKey,
    initialValue: false,
    version: "1",
  });

  const contentRef = useRef<HTMLDivElement>(null);

  const handleAccordionClick = useCallback(() => {
    setAccordingState((v) => {
      const next = !v;
      if (next) {
        setTimeout(() => {
          contentRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }, 0);
      }
      return next;
    });
  }, [setAccordingState]);

  const content = (
    <div ref={contentRef} className="ml-1 pl-1 pb-1 border-l border-b border-gray-400 flex flex-col gap-1">
      {children}
    </div>
  );

  if (!accordionKey) {
    return (
      <div className="flex flex-col gap-1">
        <span>{label}:</span>
        {content}
      </div>
    );
  }

  return (
    <div className={"pb-1 flex flex-col gap-1 " + (accordionState ? "" : "border-b border-gray-400")}>
      <button
        type="button"
        className="flex items-center justify-between hover:bg-gray-200"
        onClick={handleAccordionClick}
      >
        {label}:
        <img src={iconDropdown} alt="" className={"ml-auto w-4 h-4 " + (accordionState ? "rotate-180" : "")} />
      </button>
      {accordionState ? content : undefined}
    </div>
  );
};
