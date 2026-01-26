import { IVec2 } from "okageo";
import { useCallback, useContext, useMemo, useState } from "react";
import { GetAppStateContext } from "../../contexts/AppContext";
import { FillStyle } from "../../models";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import { rednerRGBA } from "../../utils/color";
import { FillPanel } from "./FillPanel";
import menuIcon from "../../assets/icons/three_dots_v.svg";
import { getTableShapeInfo, TableCellStyleValue, TableCoords, TableShape } from "../../shapes/table/table";
import { useShapeComposite } from "../../hooks/storeHooks";
import { createFillStyle } from "../../utils/fillStyle";
import { getPatchByApplyCellStyle } from "../../composables/shapeHandlers/tableHandler";

interface Props {
  tableId: string;
  selectedCoords: TableCoords[];
  focusBack?: () => void;
  onContextMenu: (p: IVec2, toggle?: boolean) => void;
}

export const FloatMenuTableCell: React.FC<Props> = ({ tableId, selectedCoords, focusBack, onContextMenu }) => {
  const getCtx = useContext(GetAppStateContext);
  const shapeComposite = useShapeComposite();
  const table = shapeComposite.shapeMap[tableId] as TableShape;
  const tableInfo = useMemo(() => getTableShapeInfo(table), [table]);
  const indexCoords = selectedCoords[0];
  const indexStyle = useMemo<TableCellStyleValue>(
    () =>
      tableInfo?.styles.find((style) => {
        return (
          style.a[0] <= indexCoords[0] &&
          indexCoords[0] <= style.b[0] &&
          style.a[1] <= indexCoords[1] &&
          indexCoords[1] <= style.b[1]
        );
      }) ?? {},
    [indexCoords, tableInfo],
  );
  const indexFill = useMemo(() => indexStyle.fill ?? createFillStyle({ disabled: true }), [indexStyle]);

  const popupDefaultDirection: PopupDirection = "top";
  const [popupedKey, setPopupedKey] = useState("");

  const onClickPopupButton = useCallback(
    (name: string, option?: { keepFocus?: boolean }) => {
      if (popupedKey === name) {
        setPopupedKey("");
      } else {
        setPopupedKey(name);
      }

      if (option?.keepFocus) return;
      focusBack?.();
    },
    [popupedKey, focusBack],
  );

  const onFillChanged = useCallback(
    (val: Partial<FillStyle>, draft = false) => {
      if (!tableInfo) return;

      const ctx = getCtx();
      const patch = getPatchByApplyCellStyle(
        tableInfo,
        selectedCoords,
        val.disabled ? undefined : { ...indexStyle, fill: { ...indexFill, ...val } },
        ctx.generateUuid,
      );

      if (draft) {
        ctx.setTmpShapeMap({ [tableId]: patch });
      } else {
        ctx.setTmpShapeMap({});
        ctx.patchShapes({ [tableId]: patch });
      }
    },
    [getCtx, selectedCoords, tableInfo, indexStyle, indexFill, tableId],
  );

  const handleContextMenuClick = useCallback(
    (e: React.MouseEvent) => {
      const bounds = (e.target as HTMLElement).getBoundingClientRect();
      onContextMenu({ x: (bounds.left + bounds.right) / 2, y: bounds.bottom }, true);
    },
    [onContextMenu],
  );

  return (
    <div className="flex gap-1 items-center">
      <PopupButton
        name="fill"
        opened={popupedKey === "fill"}
        popup={<FillPanel fill={indexFill} onChanged={onFillChanged} />}
        onClick={onClickPopupButton}
        defaultDirection={popupDefaultDirection}
      >
        <div className="w-8 h-8 border-2 rounded-full" style={{ backgroundColor: rednerRGBA(indexFill.color) }}></div>
      </PopupButton>
      <button
        type="button"
        className="w-10.5 h-10.5 border rounded-xs bg-white flex justify-center items-center"
        onClick={handleContextMenuClick}
      >
        <img src={menuIcon} alt="Context menu" className="w-6 h-6" />
      </button>
    </div>
  );
};
