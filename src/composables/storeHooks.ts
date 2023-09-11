import { useContext, useEffect, useMemo, useState } from "react";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { Sheet } from "../models";

export function useSelectedSheet(): Sheet | undefined {
  const acctx = useContext(AppCanvasContext);

  const [sheetState, setSheetState] = useState({});

  useEffect(() => {
    return acctx.sheetStore.watch(() => {
      setSheetState({});
    });
  }, [acctx.sheetStore]);
  useEffect(() => {
    return acctx.sheetStore.watchSelected(() => {
      setSheetState({});
    });
  }, [acctx.sheetStore]);

  return useMemo<Sheet | undefined>(() => {
    return acctx.sheetStore.getSelectedSheet();
  }, [acctx.sheetStore, sheetState]);
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

  const [sheetState, setSheetState] = useState({});

  useEffect(() => {
    return acctx.sheetStore.watch(() => {
      setSheetState({});
    });
  }, [acctx.sheetStore]);
  useEffect(() => {
    return acctx.sheetStore.watchSelected(() => {
      setSheetState({});
    });
  }, [acctx.sheetStore]);

  return useMemo<Sheet[]>(() => {
    return acctx.sheetStore.getEntities();
  }, [acctx.sheetStore, sheetState]);
}

export function useTmpSheetMap(): { [id: string]: Partial<Sheet> } {
  const acctx = useContext(AppCanvasContext);

  const [tmpState, setTmpState] = useState({});

  useEffect(() => {
    return acctx.sheetStore.watchTmpSheetMap(() => {
      setTmpState({});
    });
  }, [acctx.sheetStore]);

  return useMemo<{ [id: string]: Partial<Sheet> }>(() => {
    return acctx.sheetStore.getTmpSheetMap();
  }, [acctx.sheetStore, tmpState]);
}
