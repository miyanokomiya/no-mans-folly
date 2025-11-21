import { useCallback } from "react";

interface Props {
  type?: "button" | "submit"; // "button" by default
  value?: string;
  variant: "submit" | "delete";
  disabled?: boolean;
  onClick?: (value: string) => void;
  children: React.ReactNode;
}

export const FormButton: React.FC<Props> = ({ type, value, variant, disabled, onClick, children }) => {
  const className = [
    ...[{ submit: "border-green-500", delete: "border-red-500" }[variant]],
    ...[disabled ? "opacity-50" : "hover:bg-gray-200"],
  ].join(" ");

  const handleClick = useCallback(() => {
    onClick?.(value ?? "");
  }, [value, onClick]);

  return (
    <button
      type={type ?? "button"}
      className={className + " border-2 p-1 rounded-xs touch-none"}
      disabled={disabled}
      onClick={handleClick}
    >
      {children}
    </button>
  );
};
