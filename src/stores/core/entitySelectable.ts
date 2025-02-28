import * as okaselect from "okaselect";
import { newCallback } from "../../utils/stateful/reactives";

type Option<T> = {
  getEntityMap: () => { [id: string]: T };
  watchEntities: (fn: () => void) => () => void;
};

export function newEntitySelectable<T>(option: Option<T>) {
  let selectedMap: { [id: string]: true } = {};
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

  const selectedCallback = newCallback();
  const selectable = okaselect.useItemSelectable(option.getEntityMap, {
    onUpdated: () => {
      selectedMap = selectable.getSelected();
      lastSelected = selectable.getLastSelected();
      selectedCallback.dispatch();
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
