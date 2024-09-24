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
