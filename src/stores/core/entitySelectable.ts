import * as okaselect from "okaselect";
import { newCallback } from "../../utils/stateful/reactives";
import { isObjectEmpty } from "../../utils/commons";

type Option<T> = {
  getEntityMap: () => { [id: string]: T };
  watchEntities: (fn: () => void) => () => void;
};

export function newEntitySelectable<T>(option: Option<T>) {
  // Prepare empty map to preserve reference.
  const EMPTY_MAP: { [id: string]: true } = {};
  let selectedMap: { [id: string]: true } = EMPTY_MAP;
  let lastSelected: string | undefined = undefined;

  const unwatch = option.watchEntities(() => {
    // Check if selected entities still exist.
    // If not, get them deselected.
    const map = option.getEntityMap();
    const selected = Object.keys(selectable.getSelected());
    const filteredSelected = selected.filter((id) => map[id]);
    if (selected.length !== filteredSelected.length) {
      selectable.multiSelect(filteredSelected);
    }
  });

  const selectedCallback = newCallback<[string | undefined, { [id: string]: true }]>();
  const selectable = okaselect.useItemSelectable(option.getEntityMap, {
    onUpdated: () => {
      const val = selectable.getSelected();
      selectedMap = isObjectEmpty(val) ? EMPTY_MAP : val;
      lastSelected = selectable.getLastSelected();
      selectedCallback.dispatch([lastSelected, selectedMap]);
    },
  });

  function dispose() {
    unwatch();
  }

  return {
    watchSelected: selectedCallback.bind,
    getSelected: () => selectedMap,
    getLastSelected: () => lastSelected,
    select: selectable.select,
    multiSelect: selectable.multiSelect,
    selectAll: selectable.selectAll,
    clearAllSelected: selectable.clearAll,
    dispose,
  };
}
