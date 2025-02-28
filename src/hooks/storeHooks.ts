import { useCallback, useContext, useMemo, useSyncExternalStore } from "react";
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
export function useStaticShapeComposite(): ShapeComposite {
  const { shapeStore } = useContext(AppCanvasContext);
  return useSyncExternalStore(
    shapeStore.watch,
    useCallback(() => shapeStore.staticShapeComposite, [shapeStore]),
  );
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

export function useShapeSelectedMap(): { [id: string]: true } {
  const { shapeStore } = useContext(AppCanvasContext);
  return useSyncExternalStore(shapeStore.watchSelected, shapeStore.getSelected);
}

export function useShapeLastSelectedId(): string | undefined {
  const { shapeStore } = useContext(AppCanvasContext);
  return useSyncExternalStore(shapeStore.watchSelected, shapeStore.getLastSelected);
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

  const docMap = useDocumentMapWithoutTmpInfo();
  const tmpDocMap = useSyncExternalStore(
    useCallback(
      (onChange: () => void) => {
        const list = [documentStore.watchTmpDocMap(onChange)];
        return () => list.forEach((fn) => fn());
      },
      [documentStore],
    ),
    documentStore.getTmpDocMap,
  );

  return useMemo(() => {
    return mapReduce(docMap, (doc, id) => {
      if (!tmpDocMap[id]) return doc;
      return documentStore.patchDocDryRun(id, tmpDocMap[id]);
    });
  }, [documentStore, docMap, tmpDocMap]);
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
    documentStore.getDocMap,
  );
}
