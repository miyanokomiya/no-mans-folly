import { useCallback } from "react";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const LongPressStarter: React.FC<Props> = ({ children, className, onContextMenu, ...attrs }) => {
  const handleContextmenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (onContextMenu) {
        onContextMenu(e);
      } else {
        e.preventDefault();
      }
    },
    [onContextMenu],
  );

  return (
    <div className={"select-none touch-none " + (className ?? "")} onContextMenu={handleContextmenu} {...attrs}>
      {children}
    </div>
  );
};
