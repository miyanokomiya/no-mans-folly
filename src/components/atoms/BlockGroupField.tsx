interface Props {
  label: string;
  children?: React.ReactNode;
}

export const BlockGroupField: React.FC<Props> = ({ label, children }) => {
  return (
    <div className="flex flex-col gap-1">
      <span>{label}:</span>
      <div className="ml-2 pl-2 border-l border-gray-400 flex flex-col gap-1">{children}</div>
    </div>
  );
};
