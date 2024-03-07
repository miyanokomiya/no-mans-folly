interface Props {
  label: string;
  children: React.ReactNode;
}

export const InlineField: React.FC<Props> = ({ label, children }) => {
  return (
    <div className="flex items-center">
      <span>{label}:</span>
      <div className="ml-auto">{children}</div>
    </div>
  );
};
