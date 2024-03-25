interface Props {
  children: React.ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}

export const ListButton: React.FC<Props> = ({ onClick, type, disabled, children }) => {
  const className = "w-full p-2 border-b last:border-none flex items-center justify-start ";

  return (
    <button
      className={className + (disabled ? "line-through cursor-default" : "hover:bg-gray-200")}
      type={type ?? "button"}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

interface LinkProps {
  children: React.ReactNode;
  href: string;
  external?: boolean;
}

export const ListLink: React.FC<LinkProps> = ({ children, href, external }) => {
  return (
    <a
      className="w-full p-2 border-b last:border-none hover:bg-gray-200"
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener" : undefined}
    >
      {children}
    </a>
  );
};

export const ListSpacer: React.FC = () => {
  return <div className="h-1 w-full border-b" />;
};
