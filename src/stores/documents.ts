import * as Y from "yjs";
import { DocDelta, DocOutput } from "../models/document";
import { newCallback } from "../composables/reactives";
import { observeEntityMap } from "./core/entities";

export type CursorPositionInfo = Y.RelativePosition;

type Option = {
  ydoc: Y.Doc;
};

export function newDocumentStore(option: Option) {
  let ydoc: Y.Doc;
  let entityMap: Y.Map<Y.Text>;
  let unobserve: () => void;

  const callback = newCallback<Set<string>>();
  const watch = callback.bind;

  function getDocMap(): { [id: string]: DocOutput } {
    const ret: { [id: string]: DocOutput } = {};
    Array.from(entityMap.entries()).map(([id, ye]: [string, Y.Text]) => {
      ret[id] = ye.toDelta();
    });
    return ret;
  }

  function refresh(_ydoc: Y.Doc) {
    unobserve?.();
    ydoc = _ydoc;
    entityMap = ydoc.getMap("document_store");
    unobserve = observeEntityMap(entityMap, (ids: Set<string>) => {
      callback.dispatch(ids);
    });
  }
  refresh(option.ydoc);

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
    return Y.createAbsolutePositionFromRelativePosition(relPos, option.ydoc)?.index ?? 0;
  }

  function transact(fn: () => void) {
    option.ydoc.transact(fn);
  }

  function getScope(): Y.AbstractType<any> {
    return entityMap;
  }

  return {
    refresh,
    getDocMap,
    addDoc,
    deleteDoc,
    deleteDocs,
    patchDoc,
    patchDocs,
    createCursorPosition,
    retrieveCursorPosition,
    transact,
    getScope,
    watch,
  };
}
