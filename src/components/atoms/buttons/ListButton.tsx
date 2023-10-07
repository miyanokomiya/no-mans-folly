interface Props {
  children: React.ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
}

export const ListButton: React.FC<Props> = ({ onClick, type, children }) => {
  return (
    <button
      className="w-full p-2 border-b last:border-none hover:bg-gray-200"
      type={type ?? "button"}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
