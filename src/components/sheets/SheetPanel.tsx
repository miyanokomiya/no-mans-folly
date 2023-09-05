import { useCallback } from "react";
import { Sheet } from "../../models";

interface Props {
  sheet: Sheet;
  onClickSheet?: (id: string) => void;
  selected?: boolean;
}

export const SheetPanel: React.FC<Props> = ({ sheet, onClickSheet, selected }) => {
  const _onClickSheet = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onClickSheet?.(sheet.id);
    },
    [onClickSheet]
  );

  const rootClass = "border rounded flex p-1" + (selected ? " border-sky-400" : "");

  return (
    <div className={rootClass}>
      <a href={`TODO`} onClick={_onClickSheet} className="w-20 h-20">
        <div className="text-ellipsis overflow-hidden">{sheet.id}</div>
        <div className="text-ellipsis overflow-hidden">{sheet.name}</div>
      </a>
    </div>
  );
};
