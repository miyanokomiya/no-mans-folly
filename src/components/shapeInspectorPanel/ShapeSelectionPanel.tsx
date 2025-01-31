import { useCallback, useContext } from "react";
import { useSelectedShapes, useShapeCompositeWithoutTmpInfo } from "../../hooks/storeHooks";
import { groupBy } from "../../utils/commons";
import { GetAppStateContext } from "../../contexts/AppContext";
import { getLabel } from "../../shapes";
import { BlockGroupField } from "../atoms/BlockGroupField";
import iconDelete from "../../assets/icons/delete_filled.svg";
import iconFilter from "../../assets/icons/filter.svg";

export const ShapeSelectionPanel: React.FC = () => {
  const getCtx = useContext(GetAppStateContext);
  const shapeComposite = useShapeCompositeWithoutTmpInfo();
  const selectedShapes = useSelectedShapes();
  const grouped = groupBy(selectedShapes, (s) => s.type);
  const sorted = Object.entries(grouped).sort((a, b) => {
    const v = b[1].length - a[1].length;
    return v === 0 ? a[0].localeCompare(b[0]) : v;
  });

  const handleFilter = useCallback(
    (type: string) => {
      const list = grouped[type];
      if (!list || list.length === 0) return;

      const ctx = getCtx();
      ctx.multiSelectShapes(list.map((s) => s.id));
    },
    [grouped, getCtx],
  );

  const handleDeselect = useCallback(
    (type: string) => {
      const list = grouped[type];
      if (!list || list.length === 0) return;

      const ctx = getCtx();
      ctx.multiSelectShapes(
        list.map((s) => s.id),
        true,
      );
    },
    [grouped, getCtx],
  );

  const items = sorted.map(([type, list]) => (
    <li key={type}>
      <GroupItem
        type={type}
        label={getLabel(shapeComposite.getShapeStruct, list[0])}
        count={list.length}
        onFilter={handleFilter}
        onDeselect={handleDeselect}
      />
    </li>
  ));

  return items.length > 1 ? (
    <BlockGroupField label="Selection filter" accordionKey="shape-selection">
      <ul>{items}</ul>
    </BlockGroupField>
  ) : undefined;
};

interface GroupItemProps {
  type: string;
  label: string;
  count: number;
  onFilter: (type: string) => void;
  onDeselect: (type: string) => void;
}

const GroupItem: React.FC<GroupItemProps> = ({ type, label, count, onFilter, onDeselect }) => {
  const handleFilter = useCallback(() => {
    onFilter(type);
  }, [type, onFilter]);

  const handleDeselect = useCallback(() => {
    onDeselect(type);
  }, [type, onDeselect]);

  return (
    <div className="py-1 flex items-center justify-between">
      <span>{label}</span>
      <span className="ml-auto">({count})</span>
      <button type="button" className="ml-2 p-1 rounded-xs hover:bg-gray-200" onClick={handleFilter}>
        <img src={iconFilter} alt="" className="w-4 h-4" />
      </button>
      <button type="button" className="p-1 rounded-xs hover:bg-gray-200" onClick={handleDeselect}>
        <img src={iconDelete} alt="" className="w-4 h-4" />
      </button>
    </div>
  );
};
