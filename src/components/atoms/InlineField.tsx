interface Props {
  label: string | React.ReactNode;
  inert?: boolean;
  fullBody?: boolean;
  children: React.ReactNode;
}

export const InlineField: React.FC<Props> = ({ label, inert, fullBody, children }) => {
  const bodyClass = fullBody ? "pl-2 w-full" : "ml-auto";

  if (inert) {
    return (
      <div className="flex items-center gap-2 opacity-50">
        <span>{label}</span>
        <div className={bodyClass} inert>
          {children}
        </div>
      </div>
    );
  }

  return (
    <label className="flex items-center gap-2">
      <span>{label}</span>
      <div className={bodyClass}>{children}</div>
    </label>
  );
};
