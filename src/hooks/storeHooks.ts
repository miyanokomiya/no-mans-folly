import { useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppCanvasContext } from "../contexts/AppCanvasContext";
import { Shape, Sheet, UserSetting } from "../models";
import { ShapeStore } from "../stores/shapes";
import { ShapeComposite } from "../composables/shapeComposite";
import { DocOutput } from "../models/document";
import { mapReduce } from "../utils/commons";

export function useUserSetting(): [UserSetting, patchUserSetting: (patch: Partial<UserSetting>) => void] {
  const { userSettingStore } = useContext(AppCanvasContext);
  return [useSyncExternalStore(userSettingStore.watch, userSettingStore.getState), userSettingStore.patchState];
}

export function useSelectedSheet(): Sheet | undefined {
  const { sheetStore } = useContext(AppCanvasContext);
  return useSyncExternalStore(
    useCallback(
      (onChange: () => void) => {
        const list = [sheetStore.watch(onChange), sheetStore.watchSelected(onChange)];
        return () => list.forEach((fn) => fn());
      },
      [sheetStore],
    ),
    sheetStore.getSelectedSheet,
  );
}

export function useSelectedTmpSheet(): Sheet | undefined {
  const sheet = useSelectedSheet();
  const tmpMap = useTmpSheetMap();
  return useMemo(() => {
    return sheet ? { ...sheet, ...(tmpMap[sheet.id] ?? {}) } : undefined;
  }, [sheet, tmpMap]);
}

export function useSheets(): Sheet[] {
  const { sheetStore } = useContext(AppCanvasContext);
  return useSyncExternalStore(sheetStore.watch, sheetStore.getEntities);
}

export function useTmpSheetMap(): { [id: string]: Partial<Sheet> } {
  const { sheetStore } = useContext(AppCanvasContext);
  return useSyncExternalStore(sheetStore.watchTmpSheetMap, sheetStore.getTmpSheetMap);
}

export function useShapes(): Shape[] {
  const { shapeStore } = useContext(AppCanvasContext);
  return useSyncExternalStore(
    shapeStore.watch,
    useCallback(() => shapeStore.shapeComposite.shapes, [shapeStore]),
  );
}

export function useShapeComposite(): ShapeComposite {
  const { shapeStore } = useContext(AppCanvasContext);
  return useSyncExternalStore(
    useCallback(
      (onChange: () => void) => {
        const list = [shapeStore.watch(onChange), shapeStore.watchTmpShapeMap(onChange)];
        return () => list.forEach((fn) => fn());
      },
      [shapeStore],
    ),
    useCallback(() => shapeStore.shapeComposite, [shapeStore]),
  );
}

/**
 * This hook can greatly reduce component evaluation when temporary shapes don't matter.
 */
export function useShapeCompositeWithoutTmpInfo(targetIds?: string[]): ShapeComposite {
  const { shapeStore } = useContext(AppCanvasContext);
  const [value, setValue] = useState<ShapeComposite>(shapeStore.staticShapeComposite);

  const update = useCallback(() => {
    setValue(targetIds ? shapeStore.shapeComposite.getSubShapeComposite(targetIds) : shapeStore.shapeComposite);
  }, [shapeStore, targetIds]);

  useEffect(() => {
    update();
    return shapeStore.watch(update);
  }, [shapeStore, update]);

  return value;
}

export function useSelectedTmpShape(): Shape | undefined {
  const { shapeStore } = useContext(AppCanvasContext);
  return useSyncExternalStore(
    useCallback(
      (onChange: () => void) => {
        const list = [
          shapeStore.watch(onChange),
          shapeStore.watchTmpShapeMap(onChange),
          shapeStore.watchSelected(onChange),
        ];
        return () => list.forEach((fn) => fn());
      },
      [shapeStore],
    ),
    useCallback(() => {
      const id = shapeStore.getLastSelected();
      if (!id) return;
      return shapeStore.shapeComposite.mergedShapeMap[id];
    }, [shapeStore]),
  );
}

export function useSelectedShape(): Shape | undefined {
  const { shapeStore } = useContext(AppCanvasContext);
  return useSyncExternalStore(
    useCallback(
      (onChange: () => void) => {
        const list = [shapeStore.watch(onChange), shapeStore.watchSelected(onChange)];
        return () => list.forEach((fn) => fn());
      },
      [shapeStore],
    ),
    useCallback(() => {
      const id = shapeStore.getLastSelected();
      if (!id) return;
      return shapeStore.shapeComposite.shapeMap[id];
    }, [shapeStore]),
  );
}

export function useSelectedShapes(): Shape[] {
  const { shapeStore } = useContext(AppCanvasContext);
  const [value, setValue] = useState<Shape[]>([]);

  const update = useCallback(() => {
    const shapeMap = shapeStore.shapeComposite.shapeMap;
    setValue(Object.keys(shapeStore.getSelected()).map((id) => shapeMap[id]));
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

  return value;
}

export function useSelectedTmpShapes(): Shape[] {
  const { shapeStore } = useContext(AppCanvasContext);
  const [value, setValue] = useState<Shape[]>([]);

  const update = useCallback(() => {
    const shapeMap = shapeStore.shapeComposite.mergedShapeMap;
    setValue(Object.keys(shapeStore.getSelected()).map((id) => shapeMap[id]));
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

  return value;
}

export function useSelectedShapeInfo(): { idMap: { [id: string]: true }; lastId?: string } {
  const { shapeStore } = useContext(AppCanvasContext);
  const [value, setValue] = useState<{ idMap: { [id: string]: true }; lastId?: string }>({ idMap: {} });

  const update = useCallback(() => {
    setValue({ idMap: shapeStore.getSelected(), lastId: shapeStore.getLastSelected() });
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

  return value;
}

/**
 * Note: Just having a flag saves state update compared to having the actual count.
 */
export function useHasShape(shapeStore: ShapeStore): boolean {
  return useSyncExternalStore(
    shapeStore.watch,
    useCallback(() => shapeStore.shapeComposite.shapes.length > 0, [shapeStore]),
  );
}

export function useDocumentMap(): { [id: string]: DocOutput } {
  const { documentStore } = useContext(AppCanvasContext);
  const [value, setValue] = useState<{ [id: string]: DocOutput }>({});

  const update = useCallback(() => {
    const tmpDocMap = documentStore.getTmpDocMap();
    setValue(
      mapReduce(documentStore.getDocMap(), (doc, id) => {
        if (!tmpDocMap[id]) return doc;
        return documentStore.patchDocDryRun(id, tmpDocMap[id]);
      }),
    );
  }, [documentStore]);

  useEffect(() => {
    update();
    const list = [documentStore.watch(update), documentStore.watchTmpDocMap(update)];
    return () => list.forEach((fn) => fn());
  }, [documentStore, update]);

  return value;
}

export function useDocumentMapWithoutTmpInfo(): { [id: string]: DocOutput } {
  const { documentStore } = useContext(AppCanvasContext);
  return useSyncExternalStore(
    useCallback(
      (onChange: () => void) => {
        const list = [documentStore.watch(onChange)];
        return () => list.forEach((fn) => fn());
      },
      [documentStore],
    ),
    useCallback(() => documentStore.getDocMap(), [documentStore]),
  );
}
