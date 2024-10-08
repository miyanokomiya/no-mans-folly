interface Props {
  label: string | React.ReactNode;
  inert?: boolean;
  fullBody?: boolean;
  children: React.ReactNode;
}

export const InlineField: React.FC<Props> = ({ label, inert, fullBody, children }) => {
  const bodyClass = fullBody ? "ml-2 w-full" : "ml-auto";

  return (
    <label className={"flex items-center" + (inert ? " opacity-50" : "")}>
      <span>{label}</span>
      <div className={bodyClass} {...{ inert: inert ? "" : undefined }}>
        {children}
      </div>
    </label>
  );
};
