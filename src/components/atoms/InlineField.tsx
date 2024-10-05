interface Props {
  label: string;
  inert?: boolean;
  fullBody?: boolean;
  children: React.ReactNode;
}

export const InlineField: React.FC<Props> = ({ label, inert, fullBody, children }) => {
  const bodyClass = fullBody ? "ml-2 w-full" : "ml-auto";

  return (
    <div className={"flex items-center" + (inert ? " opacity-50" : "")} {...{ inert: inert ? "" : undefined }}>
      <span>{label}:</span>
      <div className={bodyClass}>{children}</div>
    </div>
  );
};
