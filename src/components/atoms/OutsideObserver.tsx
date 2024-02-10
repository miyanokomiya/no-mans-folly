import { useOutsideClickCallback } from "../../hooks/window";

interface Props {
  children: React.ReactNode;
  onClick: () => void;
}

export const OutsideObserver: React.FC<Props> = ({ children, onClick }) => {
  const { ref } = useOutsideClickCallback<HTMLDivElement>(onClick);
  return <div ref={ref}>{children}</div>;
};
