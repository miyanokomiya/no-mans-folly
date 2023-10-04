import * as Y from "yjs";
import { DocDelta, DocOutput } from "../models/document";
import { newCallback } from "../composables/reactives";
import { observeEntityMap } from "./core/entities";
import { newCache } from "../composables/cache";

export type CursorPositionInfo = Y.RelativePosition;

type Option = {
  ydoc: Y.Doc;
};

export function newDocumentStore(option: Option) {
  let ydoc: Y.Doc;
  let entityMap: Y.Map<Y.Text>;
  let unobserve: (() => void) | undefined;

  const callback = newCallback<Set<string>>();
  const watch = callback.bind;

  let tmpDocMap: { [id: string]: DocDelta } = {};

  function setTmpDocMap(val: { [id: string]: DocDelta }) {
    tmpDocMap = val;
    tmpDocMapCallback.dispatch();
  }

  function getTmpDocMap(): { [id: string]: DocDelta } {
    return tmpDocMap;
  }

  const tmpDocMapCallback = newCallback();

  const _entitiesCache = newCache(() => {
    const ret: { [id: string]: DocOutput } = {};
    Array.from(entityMap.entries()).map(([id, ye]: [string, Y.Text]) => {
      ret[id] = ye.toDelta();
    });
    return ret;
  });

  function getDocMap(): { [id: string]: DocOutput } {
    return _entitiesCache.getValue();
  }

  function refresh(_ydoc: Y.Doc) {
    unobserve?.();
    unobserve = undefined;

    ydoc = _ydoc;
    entityMap = ydoc.getMap("document_store");
    unobserve = observeEntityMap(entityMap, (ids: Set<string>) => {
      _entitiesCache.update();
      callback.dispatch(ids);
    });
    _entitiesCache.update();
    callback.dispatch(new Set(Object.keys(getDocMap())));
    setTmpDocMap({});
  }
  refresh(option.ydoc);

  let disposed = false;
  function dispose() {
    if (disposed) return;

    unobserve?.();
    unobserve = undefined;
    disposed = true;
  }

  function addDoc(id: string, delta: DocDelta) {
    const text = new Y.Text();
    text.applyDelta(delta);
    entityMap.set(id, text);
  }

  function deleteDoc(id: string) {
    entityMap.delete(id);
  }

  function deleteDocs(ids: string[], noTransact = false) {
    if (noTransact) {
      ids.forEach(deleteDoc);
    } else {
      transact(() => {
        ids.forEach(deleteDoc);
      });
    }
  }

  function patchDoc(id: string, delta: DocDelta) {
    const text = entityMap.get(id);
    if (!text) return addDoc(id, delta);

    text.applyDelta(delta);
  }

  function patchDocDryRun(id: string, delta: DocDelta): DocOutput {
    const text = entityMap.get(id);
    const currentDelta = text?.toDelta();

    // Create temprorary doc and bind cloned text to it.
    const doc = new Y.Doc();
    const cloned = doc.getText();
    if (currentDelta) {
      cloned.applyDelta(currentDelta);
    }
    cloned.applyDelta(delta);
    const ret = cloned.toDelta();
    doc.destroy();
    return ret;
  }

  function patchDocs(val: { [id: string]: DocDelta }) {
    transact(() => {
      Object.entries(val).forEach(([id, val]) => patchDoc(id, val));
    });
  }

  function createCursorPosition(id: string, index: number): CursorPositionInfo | undefined {
    const text = entityMap.get(id);
    if (!text) return;
    return Y.createRelativePositionFromTypeIndex(text, index);
  }

  function retrieveCursorPosition(relPos?: CursorPositionInfo): number {
    if (!relPos) return 0;
    return Y.createAbsolutePositionFromRelativePosition(relPos, ydoc)?.index ?? 0;
  }

  function transact(fn: () => void) {
    ydoc.transact(fn);
  }

  function getScope(): Y.AbstractType<any> {
    return entityMap;
  }

  return {
    refresh,
    dispose,
    getDocMap,
    addDoc,
    deleteDoc,
    deleteDocs,
    patchDoc,
    patchDocDryRun,
    patchDocs,
    createCursorPosition,
    retrieveCursorPosition,
    transact,
    getScope,
    watch,

    setTmpDocMap,
    getTmpDocMap,
    watchTmpDocMap: tmpDocMapCallback.bind,
  };
}
export type DocumentStore = ReturnType<typeof newDocumentStore>;
