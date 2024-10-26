import { useCallback, useContext, useMemo, useState } from "react";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { SheetPanel } from "./SheetPanel";
import { generateUuid } from "../../utils/random";
import iconAdd from "../../assets/icons/add_filled.svg";
import iconDelete from "../../assets/icons/delete_filled.svg";
import iconDropdown from "../../assets/icons/dropdown.svg";
import { SortableListV } from "../atoms/SortableListV";
import { useSelectedSheet, useSheets } from "../../hooks/storeHooks";
import { Dialog, DialogButtonAlert, DialogButtonPlain } from "../atoms/Dialog";
import { generateKeyBetweenAllowSame } from "../../utils/findex";
import { useLocalStorageAdopter } from "../../hooks/localStorage";

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
    setOpenDeleteConfirm(true);
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

  const [hidePanel, setHidePanel] = useLocalStorageAdopter({
    key: "sheet-list",
    version: "1",
    initialValue: false,
    duration: 100,
  });
  const toggleHidePanel = useCallback(() => {
    setHidePanel((val) => !val);
  }, [setHidePanel]);

  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const closeDeleteConfirm = useCallback(() => {
    setOpenDeleteConfirm(false);
  }, []);

  const toggleButton = (
    <button type="button" className="w-6 h-6 p-1 border rounded" onClick={toggleHidePanel}>
      <img src={iconDropdown} alt="Toggle Panel" />
    </button>
  );

  return (
    <div className="bg-white border rounded flex flex-col p-1 gap-1">
      {hidePanel ? (
        <>
          <div className="-rotate-90">{toggleButton}</div>
          <div className="overflow-auto flex flex-col" style={{ maxHeight: "calc(100vh - 100px)" }}>
            {sheets.map((sheet, i) => (
              <MinSheetButton
                key={sheet.id}
                id={sheet.id}
                index={i}
                highlight={sheet.id === selectedSheet?.id}
                onClick={onClickSheet}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-1">
            <button type="button" className="w-6 h-6 p-1 border rounded" onClick={onClickDelete}>
              <img src={iconDelete} alt="Delete Sheet" />
            </button>
            <button type="button" className="ml-auto w-6 h-6 p-1 border rounded" onClick={onClickAdd}>
              <img src={iconAdd} alt="Add Sheet" />
            </button>
            <div className="rotate-90">{toggleButton}</div>
          </div>
          <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 100px)" }}>
            <SortableListV items={sheetItems} onClick={onClickSheet} onChange={onChangeOrder} anchor="[data-anchor]" />
          </div>
        </>
      )}
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

interface MinSheetButtonProps {
  id: string;
  index: number;
  highlight?: boolean;
  onClick: (id: string) => void;
}

const MinSheetButton: React.FC<MinSheetButtonProps> = ({ id, index, highlight, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(id);
  }, [id, onClick]);

  return (
    <button
      type="button"
      className={"min-w-6 px-1 border rounded" + (highlight ? " border-sky-400" : "")}
      key={id}
      onClick={handleClick}
    >
      {index + 1}
    </button>
  );
};
