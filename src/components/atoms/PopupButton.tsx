import { useCallback } from "react";

interface Option {
  children: React.ReactNode;
  name: string;
  popup: React.ReactNode;
  opened?: boolean;
  onClick?: (key: string) => void;
}

export const PopupButton: React.FC<Option> = ({ children, popup, name, opened, onClick }) => {
  const onButtonClick = useCallback(() => {
    onClick?.(name);
  }, [name, onClick]);

  return (
    <div className="relative">
      <button
        type="button"
        className="border rounded bg-white p-1 flex justify-center items-center"
        onClick={onButtonClick}
      >
        {children}
      </button>
      {opened ? (
        <div
          className="absolute left-1/2 bottom-0 bg-white border rounded p-2 drop-shadow-md"
          style={{ transform: "translate(-50%, 100%)" }}
        >
          {popup}
        </div>
      ) : undefined}
    </div>
  );
};
