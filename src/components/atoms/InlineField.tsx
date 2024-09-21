interface Props {
  label: string;
  inert?: boolean;
  children: React.ReactNode;
}

export const InlineField: React.FC<Props> = ({ label, inert, children }) => {
  return (
    <div className={"flex items-center" + (inert ? " opacity-50" : "")} {...{ inert: inert ? "" : undefined }}>
      <span>{label}:</span>
      <div className="ml-auto">{children}</div>
    </div>
  );
};
