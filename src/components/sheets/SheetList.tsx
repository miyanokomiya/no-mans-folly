import { useCallback, useContext, useMemo, useState } from "react";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { SheetPanel } from "./SheetPanel";
import { generateUuid } from "../../utils/random";
import iconAdd from "../../assets/icons/add_filled.svg";
import iconDelete from "../../assets/icons/delete_filled.svg";
import { SortableListV } from "../atoms/SortableListV";
import { useSelectedSheet, useSheets } from "../../hooks/storeHooks";
import { Dialog, DialogButtonAlert, DialogButtonPlain } from "../atoms/Dialog";
import { Skillcheck } from "../atoms/Skillcheck";
import { generateKeyBetweenAllowSame } from "../../utils/findex";

export const SheetList: React.FC = () => {
  const acctx = useContext(AppCanvasContext);
  const selectedSheet = useSelectedSheet();
  const sheets = useSheets();

  const onClickSheet = useCallback(
    (id: string) => {
      acctx.sheetStore.selectSheet(id);
    },
    [acctx.sheetStore],
  );

  const onClickAdd = useCallback(() => {
    const currentSheets = acctx.sheetStore.getEntities();
    const selectedIndex = currentSheets.findIndex((s) => s.id === selectedSheet?.id);
    const beforeFindex = selectedSheet?.findex ?? null;
    const afterFindex = currentSheets[selectedIndex + 1]?.findex ?? null;

    const id = generateUuid();
    acctx.sheetStore.addEntity({
      id,
      findex: generateKeyBetweenAllowSame(beforeFindex, afterFindex),
      name: "New Sheet",
      bgcolor: selectedSheet?.bgcolor,
    });
    acctx.sheetStore.selectSheet(id);
  }, [acctx.sheetStore, selectedSheet]);

  const onClickDelete = useCallback(() => {
    setOpenDeleteSkillcheck(true);
  }, []);

  const deleteSheet = useCallback(() => {
    setOpenDeleteConfirm(false);
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
    [acctx.sheetStore],
  );

  const sheetItems = useMemo<[string, React.ReactNode][]>(() => {
    return sheets.map((s, i) => {
      return [
        s.id,
        <div>
          <SheetPanel
            sheet={s}
            selected={s.id === selectedSheet?.id}
            index={i + 1}
            onChangeName={onChangeName}
            onClickSheet={onClickSheet}
          />
        </div>,
      ];
    });
  }, [selectedSheet, sheets, onChangeName, onClickSheet]);

  const onChangeOrder = useCallback(
    ([from, to]: [number, number]) => {
      const target = sheets[from];
      const beforeFindex = sheets[to - 1]?.findex ?? null;
      const nextFindex = sheets[to]?.findex ?? null;

      acctx.sheetStore.patchEntity(target.id, {
        findex: generateKeyBetweenAllowSame(beforeFindex, nextFindex),
      });
    },
    [sheets, acctx.sheetStore],
  );

  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const closeDeleteConfirm = useCallback(() => {
    setOpenDeleteConfirm(false);
  }, []);
  const [openDeleteSkillcheck, setOpenDeleteSkillcheck] = useState(false);
  const onFailDeleteSkillcheck = useCallback(() => {
    setOpenDeleteSkillcheck(false);
  }, []);
  const onSucessDeleteSkillcheck = useCallback(() => {
    setOpenDeleteSkillcheck(false);
    setOpenDeleteConfirm(true);
  }, []);

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
      <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 100px)" }}>
        <SortableListV items={sheetItems} onClick={onClickSheet} onChange={onChangeOrder} anchor="[data-anchor]" />
      </div>
      <Skillcheck open={openDeleteSkillcheck} onSuccess={onSucessDeleteSkillcheck} onFail={onFailDeleteSkillcheck} />
      <Dialog
        open={openDeleteConfirm}
        onClose={closeDeleteConfirm}
        title="Delete sheet"
        actions={
          <>
            <DialogButtonPlain onClick={closeDeleteConfirm}>Cancel</DialogButtonPlain>
            <DialogButtonAlert onClick={deleteSheet}>Delete</DialogButtonAlert>
          </>
        }
      >
        <div>
          <p>This action cannot be undone</p>
        </div>
      </Dialog>
    </div>
  );
};
