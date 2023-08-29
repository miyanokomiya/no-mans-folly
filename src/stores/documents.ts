import * as Y from "yjs";
import { DocDelta, DocOutput } from "../models/document";
import { newCallback } from "../composables/reactives";

type Option = {
  ydoc: Y.Doc;
};

export function newDocumentStore(option: Option) {
  const entityMap: Y.Map<Y.Text> = option.ydoc.getMap("document_store");

  function getDocMap(): { [id: string]: DocOutput } {
    const ret: { [id: string]: DocOutput } = {};
    Array.from(entityMap.entries()).map(([id, ye]: [string, Y.Text]) => {
      ret[id] = ye.toDelta();
    });
    return ret;
  }

  function addDoc(id: string, delta: DocDelta) {
    const text = new Y.Text();
    text.applyDelta(delta);
    entityMap.set(id, text);
  }

  function deleteDoc(id: string) {
    entityMap.delete(id);
  }

  function patchDoc(id: string, delta: DocDelta) {
    const text = entityMap.get(id);
    if (!text) return addDoc(id, delta);

    text.applyDelta(delta);
  }

  function transact(fn: () => void) {
    option.ydoc.transact(fn);
  }

  function getScope(): Y.AbstractType<any> {
    return entityMap;
  }

  const callback = newCallback();
  const watch = callback.bind;
  entityMap.observeDeep(callback.dispatch);

  return {
    getDocMap,
    addDoc,
    deleteDoc,
    patchDoc,
    transact,
    getScope,
    watch,
  };
}
