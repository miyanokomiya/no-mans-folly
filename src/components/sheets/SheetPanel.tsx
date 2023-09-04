import { useCallback } from "react";
import { Sheet } from "../../models";

interface Props {
  sheet: Sheet;
  onClickSheet?: () => void;
  selected?: boolean;
}

export const SheetPanel: React.FC<Props> = ({ sheet, onClickSheet, selected }) => {
  const _onClickSheet = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onClickSheet?.();
    },
    [onClickSheet]
  );

  const rootClass = selected ? "border-2 rounded p-1 w-24 h-24 border-sky-400" : "border rounded p-1 w-24 h-24";

  return (
    <div className={rootClass}>
      <a href={`TODO`} onClick={_onClickSheet}>
        <div>{sheet.id}</div>
        <div>{sheet.name}</div>
      </a>
    </div>
  );
};
