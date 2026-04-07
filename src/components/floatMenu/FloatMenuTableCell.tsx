import { IVec2 } from "okageo";
import { useCallback, useContext, useMemo } from "react";
import { GetAppStateContext } from "../../contexts/AppContext";
import { FillStyle } from "../../models";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import { rednerRGBA } from "../../utils/color";
import { FillPanel } from "./FillPanel";
import menuIcon from "../../assets/icons/three_dots_v.svg";
import {
  getIndexStyleValueAt,
  getTableShapeInfo,
  TableCellStyleValueRaw,
  TableCoords,
  TableShape,
} from "../../shapes/table/table";
import { useShapeComposite } from "../../hooks/storeHooks";
import { createFillStyle } from "../../utils/fillStyle";
import { getPatchByApplyCellStyle } from "../../composables/shapeHandlers/tableHandler";
import { StrokePanel } from "./StrokePanel";
import { CellAlignButton } from "./CellAlignButton";

interface Props {
  tableId: string;
  selectedCoords: TableCoords[];
  focusBack?: () => void;
  onContextMenu: (p: IVec2, toggle?: boolean) => void;
  popupKey: string;
  onPopupKeyChange: (name: string, option?: { keepFocus?: boolean }) => void;
}

export const FloatMenuTableCell: React.FC<Props> = ({
  tableId,
  selectedCoords,
  focusBack,
  onContextMenu,
  popupKey,
  onPopupKeyChange,
}) => {
  const getCtx = useContext(GetAppStateContext);
  const shapeComposite = useShapeComposite();
  const table = shapeComposite.mergedShapeMap[tableId] as TableShape;
  const tableInfo = useMemo(() => getTableShapeInfo(table), [table]);
  const indexCoords = selectedCoords[0];
  const indexCellStyle = useMemo<TableCellStyleValueRaw>(() => {
    if (!tableInfo) return {};
    return getIndexStyleValueAt(tableInfo, indexCoords);
  }, [indexCoords, tableInfo]);
  const indexCellFill = useMemo(() => indexCellStyle.fill ?? createFillStyle({ disabled: true }), [indexCellStyle]);

  const popupDefaultDirection: PopupDirection = "top";

  const onCellFillChanged = useCallback(
    (val: Partial<FillStyle>, draft = false) => {
      if (!tableInfo) return;

      const ctx = getCtx();
      const patch = getPatchByApplyCellStyle(
        tableInfo,
        selectedCoords,
        { fill: { ...indexCellFill, ...val }, t: Date.now() },
        ctx.generateUuid,
      );

      if (draft) {
        ctx.setTmpShapeMap({ [tableId]: patch });
      } else {
        ctx.setTmpShapeMap({});
        ctx.patchShapes({ [tableId]: patch });
        focusBack?.();
      }
    },
    [focusBack, getCtx, selectedCoords, tableInfo, indexCellFill, tableId],
  );

  const onCellFieldChanged = useCallback(
    (val: TableCellStyleValueRaw, draft = false) => {
      if (!tableInfo) return;

      const ctx = getCtx();
      const patch = getPatchByApplyCellStyle(tableInfo, selectedCoords, { ...val, t: Date.now() }, ctx.generateUuid);

      if (draft) {
        ctx.setTmpShapeMap({ [tableId]: patch });
      } else {
        ctx.setTmpShapeMap({});
        ctx.updateShapes({ update: { [tableId]: patch } });
        focusBack?.();
      }
    },
    [focusBack, getCtx, selectedCoords, tableInfo, tableId],
  );

  const onFillChanged = useCallback(
    (val: Partial<FillStyle>, draft = false) => {
      const ctx = getCtx();
      const patch: Partial<TableShape> = {
        fill: { ...table.fill, ...val },
      };

      if (draft) {
        ctx.setTmpShapeMap({ [table.id]: patch });
      } else {
        ctx.setTmpShapeMap({});
        ctx.patchShapes({ [table.id]: patch });
        focusBack?.();
      }
    },
    [focusBack, getCtx, table],
  );

  const onStrokeChanged = useCallback(
    (val: Partial<FillStyle>, draft = false) => {
      const ctx = getCtx();
      const patch: Partial<TableShape> = {
        stroke: { ...table.stroke, ...val },
      };

      if (draft) {
        ctx.setTmpShapeMap({ [table.id]: patch });
      } else {
        ctx.setTmpShapeMap({});
        ctx.patchShapes({ [table.id]: patch });
        focusBack?.();
      }
    },
    [focusBack, getCtx, table],
  );

  const bodyStroke = table.bodyStroke ?? table.stroke;
  const onBodyStrokeChanged = useCallback(
    (val: Partial<FillStyle>, draft = false) => {
      const ctx = getCtx();
      const patch: Partial<TableShape> = {
        bodyStroke: { ...bodyStroke, ...val },
      };

      if (draft) {
        ctx.setTmpShapeMap({ [tableId]: patch });
      } else {
        ctx.setTmpShapeMap({});
        ctx.patchShapes({ [tableId]: patch });
        focusBack?.();
      }
    },
    [focusBack, getCtx, tableId, bodyStroke],
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
        opened={popupKey === "fill"}
        popup={<FillPanel fill={table.fill} onChanged={onFillChanged} />}
        onClick={onPopupKeyChange}
        defaultDirection={popupDefaultDirection}
      >
        <div className="w-8 h-8 border-2 rounded-full" style={{ backgroundColor: rednerRGBA(table.fill.color) }}></div>
      </PopupButton>
      <PopupButton
        name="stroke"
        opened={popupKey === "stroke"}
        popup={<StrokePanel stroke={table.stroke} onChanged={onStrokeChanged} />}
        onClick={onPopupKeyChange}
        defaultDirection={popupDefaultDirection}
      >
        <div className="w-8 h-8 flex justify-center items-center">
          <div
            className="w-1.5 h-9 border rounded-xs rotate-45"
            style={{ backgroundColor: rednerRGBA(table.stroke.color) }}
          ></div>
        </div>
      </PopupButton>
      <PopupButton
        name="body-stroke"
        opened={popupKey === "body-stroke"}
        popup={<StrokePanel stroke={bodyStroke} onChanged={onBodyStrokeChanged} />}
        onClick={onPopupKeyChange}
        defaultDirection={popupDefaultDirection}
      >
        <div className="w-8 h-8 relative">
          <div
            className="w-8 h-1.5 border rounded-xs absolute top-1/2 left-0 -translate-y-1/2"
            style={{ backgroundColor: rednerRGBA(bodyStroke.color) }}
          ></div>
          <div
            className="w-1.5 h-8 border rounded-xs absolute top-0 left-1/2 -translate-x-1/2"
            style={{ backgroundColor: rednerRGBA(bodyStroke.color) }}
          ></div>
        </div>
      </PopupButton>
      <div className="h-8 mx-0.5 border"></div>
      <PopupButton
        name="cell-fill"
        opened={popupKey === "cell-fill"}
        popup={<FillPanel fill={indexCellFill} onChanged={onCellFillChanged} />}
        onClick={onPopupKeyChange}
        defaultDirection={popupDefaultDirection}
      >
        <div className="w-8 h-8 flex items-center justify-center">
          <div className="w-8 h-6 border-2 rounded" style={{ backgroundColor: rednerRGBA(indexCellFill.color) }}></div>
        </div>
      </PopupButton>
      <CellAlignButton
        popupKey={popupKey}
        setPopupKey={onPopupKeyChange}
        defaultDirection={popupDefaultDirection}
        cellAlign={indexCellStyle}
        onChange={onCellFieldChanged}
      />
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
