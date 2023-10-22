interface Props {
  children: React.ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
}

export const ListButton: React.FC<Props> = ({ onClick, type, children }) => {
  return (
    <button
      className="w-full p-2 border-b last:border-none hover:bg-gray-200"
      type={type ?? "button"}
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
