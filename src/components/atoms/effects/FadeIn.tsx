import { useEffect, useState } from "react";

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
}

export const FadeIn: React.FC<FadeInProps> = ({ children, className }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return <div className={(className ?? "") + " transition-opacity" + (mounted ? "" : " opacity-0")}>{children}</div>;
};
