import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { SheetPanel } from "./SheetPanel";
import { generateUuid } from "../../utils/random";
import { generateKeyBetween } from "fractional-indexing";
import iconAdd from "../../assets/icons/add_filled.svg";
import iconDelete from "../../assets/icons/delete_filled.svg";

export const SheetList: React.FC = () => {
  const acctx = useContext(AppCanvasContext);

  const [sheetState, setSheetState] = useState<any>({});

  useEffect(() => {
    return acctx.sheetStore.watch(() => {
      setSheetState({});
    });
  }, []);

  useEffect(() => {
    return acctx.sheetStore.watchSelected(() => {
      setSheetState({});
    });
  }, [acctx.sheetStore]);

  const selectedSheet = useMemo(() => {
    return acctx.sheetStore.getSelectedSheet();
  }, [acctx.sheetStore, sheetState]);

  const onClickSheet = useCallback(
    (id: string) => {
      acctx.sheetStore.selectSheet(id);
    },
    [acctx.sheetStore]
  );

  const onClickAdd = useCallback(() => {
    const currentSheets = acctx.sheetStore.getEntities();
    const selectedIndex = currentSheets.findIndex((s) => s.id === selectedSheet?.id);
    const beforeFindex = selectedSheet?.findex ?? null;
    const afterFindex = currentSheets[selectedIndex + 1]?.findex ?? null;

    const id = generateUuid();
    acctx.sheetStore.addEntity({
      id,
      findex: generateKeyBetween(beforeFindex, afterFindex),
      name: "New Sheet",
    });
    acctx.sheetStore.selectSheet(id);
  }, [acctx.sheetStore, selectedSheet]);

  const onClickDelete = useCallback(() => {
    const currentSheets = acctx.sheetStore.getEntities();
    if (!selectedSheet || currentSheets.length <= 1) return;

    const selectedIndex = currentSheets.findIndex((s) => s.id === selectedSheet?.id);
    const nextSelected = currentSheets[Math.max(selectedIndex - 1, 0)].id;
    acctx.sheetStore.selectSheet(nextSelected);
    acctx.sheetStore.deleteEntities([selectedSheet.id]);
  }, [acctx.sheetStore, selectedSheet]);

  const sheetPanels = useMemo(() => {
    const sheets = acctx.sheetStore.getEntities();
    return sheets.map((s) => {
      return (
        <div key={s.id} className="">
          <SheetPanel sheet={s} selected={s.id === selectedSheet?.id} onClickSheet={onClickSheet} />{" "}
        </div>
      );
    });
  }, [acctx.sheetStore, sheetState, onClickSheet]);

  return (
    <div className="border rounded flex flex-col p-1 gap-1">
      <div className="flex justify-between gap-1">
        <button type="button" className="w-6 h-6 p-1 border rounded" onClick={onClickDelete}>
          <img src={iconDelete} alt="Delete Sheet" />
        </button>
        <button type="button" className="w-6 h-6 p-1 border rounded" onClick={onClickAdd}>
          <img src={iconAdd} alt="Add Sheet" />
        </button>
      </div>
      <div className="flex flex-col items-center gap-1">{sheetPanels}</div>
    </div>
  );
};
