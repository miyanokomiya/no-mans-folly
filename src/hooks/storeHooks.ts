import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { Sheet } from "../models";

export function useSelectedSheet(): Sheet | undefined {
  const acctx = useContext(AppCanvasContext);

  const [selectedSheet, setSelectedSheet] = useState<Sheet>();

  const update = useCallback(() => {
    setSelectedSheet(acctx.sheetStore.getSelectedSheet());
  }, [acctx.sheetStore]);

  useEffect(() => {
    update();
    const clears = [
      acctx.sheetStore.watch(() => {
        update();
      }),
      acctx.sheetStore.watchSelected(() => {
        update();
      }),
    ];

    return () => clears.forEach((f) => f());
  }, [acctx.sheetStore, update]);

  return selectedSheet;
}

export function useSelectedTmpSheet(): Sheet | undefined {
  const sheet = useSelectedSheet();
  const tmpMap = useTmpSheetMap();
  return useMemo(() => {
    return sheet ? { ...sheet, ...(tmpMap[sheet.id] ?? {}) } : undefined;
  }, [sheet, tmpMap]);
}

export function useSheets(): Sheet[] {
  const acctx = useContext(AppCanvasContext);

  const [sheets, setSheets] = useState<Sheet[]>([]);

  const update = useCallback(() => {
    setSheets(acctx.sheetStore.getEntities());
  }, [acctx.sheetStore]);

  useEffect(() => {
    update();
    return acctx.sheetStore.watch(() => {
      update();
    });
  }, [acctx.sheetStore, update]);

  return sheets;
}

export function useTmpSheetMap(): { [id: string]: Partial<Sheet> } {
  const acctx = useContext(AppCanvasContext);

  const [tmpMap, setTmpMap] = useState<{ [id: string]: Partial<Sheet> }>({});

  useEffect(() => {
    setTmpMap(acctx.sheetStore.getTmpSheetMap());
    return acctx.sheetStore.watchTmpSheetMap(() => {
      setTmpMap(acctx.sheetStore.getTmpSheetMap());
    });
  }, [acctx.sheetStore]);

  return tmpMap;
}
