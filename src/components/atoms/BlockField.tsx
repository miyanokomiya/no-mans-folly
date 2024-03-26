interface Props {
  label: string;
  children?: React.ReactNode;
}

export const BlockField: React.FC<Props> = ({ label, children }) => {
  return (
    <div className="flex flex-col gap-1">
      <span>{label}:</span>
      <div className="ml-auto">{children}</div>
    </div>
  );
};

export const BlockGroupField: React.FC<Props> = ({ label, children }) => {
  return (
    <div className="flex flex-col gap-1">
      <span>{label}:</span>
      <div className="w-full ml-2 pl-2 border-l border-gray-400 flex flex-col gap-1">{children}</div>
    </div>
  );
};
