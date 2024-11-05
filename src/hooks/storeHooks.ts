import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { Shape, Sheet } from "../models";
import { ShapeStore } from "../stores/shapes";
import { ShapeComposite } from "../composables/shapeComposite";

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

export function useShapes(): Shape[] {
  const { shapeStore } = useContext(AppCanvasContext);
  const [shapes, setShapes] = useState<Shape[]>([]);

  const update = useCallback(() => {
    setShapes(shapeStore.shapeComposite.shapes);
  }, [shapeStore]);

  useEffect(() => {
    update();
    const clears = [
      shapeStore.watch(() => {
        update();
      }),
    ];

    return () => clears.forEach((f) => f());
  }, [shapeStore, update]);

  return shapes;
}

export function useShapeComposite(): ShapeComposite {
  const { shapeStore } = useContext(AppCanvasContext);
  const [shapeComposite, setShapeComposite] = useState<ShapeComposite>(shapeStore.shapeComposite);

  const update = useCallback(() => {
    setShapeComposite(shapeStore.shapeComposite);
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
    ];

    return () => clears.forEach((f) => f());
  }, [shapeStore, update]);

  return shapeComposite;
}

/**
 * This hook can greatly reduce component evaluation when temporary shapes don't matter.
 */
export function useShapeCompositeWithoutTmpInfo(targetIds?: string[]): ShapeComposite {
  const { shapeStore } = useContext(AppCanvasContext);
  const [shapeComposite, setShapeComposite] = useState<ShapeComposite>(shapeStore.shapeComposite);

  const update = useCallback(() => {
    setShapeComposite(
      targetIds
        ? shapeStore.shapeComposite.getSubShapeComposite(targetIds)
        : shapeStore.shapeComposite.getShapeCompositeWithoutTmpInfo(),
    );
  }, [shapeStore, targetIds]);

  useEffect(() => {
    update();
    const clears = [
      shapeStore.watch(() => {
        update();
      }),
    ];

    return () => clears.forEach((f) => f());
  }, [shapeStore, update]);

  return shapeComposite;
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

export function useSelectedShapes(): Shape[] {
  const { shapeStore } = useContext(AppCanvasContext);
  const [selectedShapes, setSelectedShapes] = useState<Shape[]>([]);

  const update = useCallback(() => {
    const shapeMap = shapeStore.shapeComposite.shapeMap;
    setSelectedShapes(Object.keys(shapeStore.getSelected()).map((id) => shapeMap[id]));
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

  return selectedShapes;
}

export function useSelectedTmpShapes(): Shape[] {
  const { shapeStore } = useContext(AppCanvasContext);
  const [selectedTmpShapes, setSelectedTmpShapes] = useState<Shape[]>([]);

  const update = useCallback(() => {
    const shapeMap = shapeStore.shapeComposite.mergedShapeMap;
    setSelectedTmpShapes(Object.keys(shapeStore.getSelected()).map((id) => shapeMap[id]));
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

  return selectedTmpShapes;
}

export function useSelectedShapeInfo(): { idMap: { [id: string]: true }; lastId?: string } {
  const { shapeStore } = useContext(AppCanvasContext);
  const [selectedMap, setSelectedMap] = useState<{ [id: string]: true }>({});
  const [lastId, setLastId] = useState<string>();

  const update = useCallback(() => {
    setSelectedMap(shapeStore.getSelected());
    setLastId(shapeStore.getLastSelected());
  }, [shapeStore]);

  useEffect(() => {
    update();
    const clears = [
      shapeStore.watchSelected(() => {
        update();
      }),
    ];

    return () => clears.forEach((f) => f());
  }, [shapeStore, update]);

  return { idMap: selectedMap, lastId };
}

/**
 * Note: Just having a flag saves state update compared to having the actual count.
 */
export function useHasShape(shapeStore: ShapeStore): boolean {
  const [hasShape, setHasShape] = useState(false);
  useEffect(() => {
    setHasShape(shapeStore.shapeComposite.shapes.length > 0);
    return shapeStore.watch(() => {
      setHasShape(shapeStore.shapeComposite.shapes.length > 0);
    });
  }, [shapeStore]);

  return hasShape;
}
