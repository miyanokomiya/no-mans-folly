import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { Shape, Sheet } from "../models";

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

export function useSelectedTmpShape(): Shape | undefined {
  const { shapeStore } = useContext(AppCanvasContext);
  const [selectedShape, setSelectedShape] = useState<Shape>();

  const update = useCallback(() => {
    const id = shapeStore.getLastSelected();
    if (!id) {
      setSelectedShape(undefined);
      return;
    }

    setSelectedShape(shapeStore.shapeComposite.mergedShapeMap[id]);
  }, [shapeStore]);

  useEffect(() => {
    update();
    const clears = [
      shapeStore.watch(() => {
        update();
      }),
      shapeStore.watchTmpShapeMap(() => {
        update();
      }),
      shapeStore.watchSelected(() => {
        update();
      }),
    ];

    return () => clears.forEach((f) => f());
  }, [shapeStore, update]);

  return selectedShape;
}

export function useSelectedShape(): Shape | undefined {
  const { shapeStore } = useContext(AppCanvasContext);
  const [selectedShape, setSelectedShape] = useState<Shape>();

  const update = useCallback(() => {
    const id = shapeStore.getLastSelected();
    if (!id) {
      setSelectedShape(undefined);
      return;
    }

    setSelectedShape(shapeStore.shapeComposite.shapeMap[id]);
  }, [shapeStore]);

  useEffect(() => {
    update();
    const clears = [
      shapeStore.watch(() => {
        update();
      }),
      shapeStore.watchSelected(() => {
        update();
      }),
    ];

    return () => clears.forEach((f) => f());
  }, [shapeStore, update]);

  return selectedShape;
}
