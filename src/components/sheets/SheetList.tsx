import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { SheetPanel } from "./SheetPanel";
import { generateUuid } from "../../utils/random";
import iconAdd from "../../assets/icons/add_filled.svg";
import iconDropdown from "../../assets/icons/dropdown.svg";
import { SortableListV } from "../atoms/SortableListV";
import { useSelectedSheet, useSheets } from "../../hooks/storeHooks";
import { Dialog, DialogButtonAlert, DialogButtonPlain } from "../atoms/Dialog";
import { generateKeyBetweenAllowSame } from "../../utils/findex";
import { useLocalStorageAdopter } from "../../hooks/localStorage";
import { useUserSetting } from "../../hooks/storeHooks";
import { AppStateContext } from "../../contexts/AppContext";
import { SHEET_THUMBNAIL_PREFIX } from "../../utils/fileAccess";

export const SheetList: React.FC = () => {
  const acctx = useContext(AppCanvasContext);
  const selectedSheet = useSelectedSheet();
  const sheets = useSheets();
  const [userSetting] = useUserSetting();
  const [deleteTargetId, setDeleteTargetId] = useState<string>();
  const canDeleteSheet = useMemo(() => sheets.length > 1, [sheets]);
  const smctx = useContext(AppStateContext);
  const imageStore = smctx.getImageStore();

  const [thumbnails, setThumbnails] = useState<Record<string, HTMLImageElement>>({});
  useEffect(() => {
    const imageIdToSheetIdMap = new Map(sheets.map((s) => [`${SHEET_THUMBNAIL_PREFIX}${s.id}.svg`, s.id]));
    setThumbnails(
      imageIdToSheetIdMap.entries().reduce<Record<string, HTMLImageElement>>((acc, [imageId, sheetId]) => {
        const image = imageStore.getImage(imageId);
        if (image) acc[sheetId] = image;
        return acc;
      }, {}),
    );
    return imageStore.watch(([id, image]) => {
      const sheetId = imageIdToSheetIdMap.get(id);
      if (sheetId) {
        setThumbnails((val) => ({ ...val, [sheetId]: image }));
      }
    });
  }, [imageStore, sheets]);

  const handleSheetSelect = useCallback(
    (id: string) => {
      acctx.sheetStore.selectSheet(id);
    },
    [acctx.sheetStore],
  );

  const handleSheetAdd = useCallback(() => {
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

  const handleSheetDeleteConfirm = useCallback((id: string) => {
    setDeleteTargetId(id);
  }, []);

  const handleSheetDelete = useCallback(() => {
    if (!deleteTargetId) return;
    setDeleteTargetId(undefined);

    if (selectedSheet?.id === deleteTargetId) {
      const currentSheets = acctx.sheetStore.getEntities();
      const selectedIndex = currentSheets.findIndex((s) => s.id === selectedSheet?.id);
      const nextSelected = currentSheets[Math.max(selectedIndex - 1, 0)].id;
      acctx.sheetStore.selectSheet(nextSelected);
    }

    acctx.sheetStore.deleteEntities([deleteTargetId]);
  }, [acctx.sheetStore, selectedSheet, deleteTargetId]);

  const handleSheetDeleteCancel = useCallback(() => {
    setDeleteTargetId(undefined);
  }, []);

  const handleNameChange = useCallback(
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
            canDeleteSheet={canDeleteSheet}
            thumbnail={thumbnails[s.id]}
            onChangeName={handleNameChange}
            onDelete={handleSheetDeleteConfirm}
            onClickSheet={handleSheetSelect}
          />
        </div>,
      ];
    });
  }, [
    selectedSheet,
    sheets,
    canDeleteSheet,
    thumbnails,
    handleNameChange,
    handleSheetDeleteConfirm,
    handleSheetSelect,
  ]);

  const handleOrderChange = useCallback(
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

  const toggleButton = (
    <button type="button" className="w-6 h-6 p-1 border rounded-xs" onClick={toggleHidePanel}>
      <img src={iconDropdown} alt="Toggle Panel" />
    </button>
  );

  return userSetting.displayMode === "no-hud" ? undefined : (
    <div className="bg-white border rounded-xs flex flex-col p-1 gap-1">
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
                onClick={handleSheetSelect}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-1">
            <button type="button" className="w-6 h-6 p-1 border rounded-xs" onClick={handleSheetAdd}>
              <img src={iconAdd} alt="Add Sheet" />
            </button>
            <div className="rotate-90">{toggleButton}</div>
          </div>
          <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 100px)" }}>
            <SortableListV
              items={sheetItems}
              onClick={handleSheetSelect}
              onChange={handleOrderChange}
              anchor="[data-anchor]"
            />
          </div>
        </>
      )}
      <Dialog
        open={!!deleteTargetId}
        onClose={handleSheetDeleteCancel}
        title="Delete sheet"
        actions={
          <>
            <DialogButtonPlain onClick={handleSheetDeleteCancel}>Cancel</DialogButtonPlain>
            <DialogButtonAlert onClick={handleSheetDelete}>Delete</DialogButtonAlert>
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
      className={"min-w-6 px-1 border rounded-xs" + (highlight ? " border-sky-400" : "")}
      key={id}
      onClick={handleClick}
    >
      {index + 1}
    </button>
  );
};
