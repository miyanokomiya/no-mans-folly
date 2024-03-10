import { useOutsideClickCallback } from "../../hooks/window";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onClick: () => void;
}

export const OutsideObserver: React.FC<Props> = ({ children, onClick, ...atrs }) => {
  const { ref } = useOutsideClickCallback<HTMLDivElement>(onClick);
  return (
    <div ref={ref} {...atrs}>
      {children}
    </div>
  );
};
