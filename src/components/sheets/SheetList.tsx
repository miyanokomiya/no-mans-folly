import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { SheetPanel } from "./SheetPanel";
import { generateUuid } from "../../utils/random";
import { generateKeyBetween } from "fractional-indexing";
import iconAdd from "../../assets/icons/add_filled.svg";
import iconDelete from "../../assets/icons/delete_filled.svg";
import { SortableListV } from "../atoms/SortableListV";

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

  const onChangeName = useCallback(
    (id: string, name: string) => {
      acctx.sheetStore.patchEntity(id, { name });
    },
    [acctx.sheetStore]
  );

  const sheetItems = useMemo<[string, React.ReactNode][]>(() => {
    const sheets = acctx.sheetStore.getEntities();
    return sheets.map((s, i) => {
      return [
        s.id,
        <div key={s.id}>
          <SheetPanel sheet={s} selected={s.id === selectedSheet?.id} index={i + 1} onChangeName={onChangeName} />{" "}
        </div>,
      ];
    });
  }, [acctx.sheetStore, sheetState, onClickSheet]);

  const onChangeOrder = useCallback(
    ([from, to]: [number, number]) => {
      const sheets = acctx.sheetStore.getEntities();
      const target = sheets[from];
      const beforeFindex = sheets[to - 1]?.findex ?? null;
      const nextFindex = sheets[to]?.findex ?? null;

      acctx.sheetStore.patchEntity(target.id, {
        findex: generateKeyBetween(beforeFindex, nextFindex),
      });
    },
    [acctx.sheetStore]
  );

  return (
    <div className="bg-white border rounded flex flex-col p-1 gap-1">
      <div className="flex justify-between gap-1">
        <button type="button" className="w-6 h-6 p-1 border rounded" onClick={onClickDelete}>
          <img src={iconDelete} alt="Delete Sheet" />
        </button>
        <button type="button" className="w-6 h-6 p-1 border rounded" onClick={onClickAdd}>
          <img src={iconAdd} alt="Add Sheet" />
        </button>
      </div>
      <div className="overflow-y-scroll" style={{ maxHeight: "calc(100vh - 100px)" }}>
        <SortableListV items={sheetItems} onClick={onClickSheet} onChange={onChangeOrder} anchor="[data-anchor]" />
      </div>
    </div>
  );
};
