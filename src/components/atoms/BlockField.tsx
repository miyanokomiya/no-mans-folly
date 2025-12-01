interface Props {
  label: string;
  fullBody?: boolean;
  children?: React.ReactNode;
}

export const BlockField: React.FC<Props> = ({ label, fullBody, children }) => {
  const bodyClass = fullBody ? "pl-2 w-full" : "ml-auto";

  return (
    <div className="flex flex-col gap-1">
      <span>{label}:</span>
      <div className={bodyClass}>{children}</div>
    </div>
  );
};
