import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { ShapeComposite } from "../../composables/shapeComposite";
import { useSelectedShapeInfo, useShapeComposite } from "../../hooks/storeHooks";
import { TreeNode } from "../../utils/tree";
import { AppStateMachineContext, GetAppStateContext } from "../../contexts/AppContext";
import plusIcon from "../../assets/icons/plus.svg";
import minusIcon from "../../assets/icons/minus.svg";

interface Props {}

export const ShapeTreePanel: React.FC<Props> = () => {
  const shapeComposite = useShapeComposite();
  const { idMap: selectedIdMap, lastId: selectedLastId } = useSelectedShapeInfo();
  const rootNodeProps = useMemo(() => {
    const selected = selectedLastId ? shapeComposite.mergedShapeMap[selectedLastId]?.parentId : undefined;
    return shapeComposite.mergedShapeTree.map((n) =>
      getUITreeNodeProps(shapeComposite, selectedIdMap, selectedLastId, selected, n, 0),
    );
  }, [shapeComposite, selectedIdMap, selectedLastId]);

  const { handleEvent } = useContext(AppStateMachineContext);
  const getCtx = useContext(GetAppStateContext);

  const handleNodeSelect = useCallback(
    (id: string, multi = false) => {
      const ctx = getCtx();

      if (multi) {
        ctx.multiSelectShapes([id], true);
      } else {
        ctx.selectShape(id);
        handleEvent({
          type: "state",
          data: {
            name: "PanToShape",
            options: {
              ids: [id],
              duration: 150,
            },
          },
        });
      }
    },
    [getCtx, handleEvent],
  );

  return (
    <div>
      <ul>
        {rootNodeProps.map((n) => (
          <li key={n.id}>
            <UITreeNode
              id={n.id}
              name={n.name}
              level={n.level}
              selected={n.selected}
              prime={n.prime}
              primeSibling={n.primeSibling}
              childNode={n.childNode}
              onSelect={handleNodeSelect}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

interface UITreeNodeProps {
  id: string;
  name: string;
  childNode: UITreeNodeProps[];
  level: number;
  selected: boolean;
  prime: boolean;
  primeSibling: boolean;
  onSelect?: (id: string, multi?: boolean) => void;
}

const UITreeNode: React.FC<UITreeNodeProps> = ({
  id,
  name,
  childNode,
  level,
  selected,
  prime,
  primeSibling,
  onSelect,
}) => {
  const selectedClass = prime ? " bg-red-300 font-bold" : selected ? " bg-yellow-300 font-bold" : "";

  const handleNodeDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      onSelect?.(id);
    },
    [id, onSelect],
  );

  const handleNodeSelectDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      onSelect?.(id, true);
    },
    [id, onSelect],
  );

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!prime || !rootRef.current) return;

    rootRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [prime]);

  return (
    <div ref={rootRef}>
      <div className="flex items-center">
        <div className="ml-1 w-2 border-t-2 border-gray-400" />
        <button
          type="button"
          className={"px-1 rounded w-full text-left" + selectedClass}
          onPointerDown={handleNodeDown}
        >
          {name}
        </button>
        {primeSibling ? (
          <button
            type="button"
            className="border border-gray-400 rounded-full flex items-center justify-center"
            onPointerDown={handleNodeSelectDown}
          >
            {selected ? (
              <img className="w-4 h-4" src={minusIcon} alt="Deselect" />
            ) : (
              <img className="w-4 h-4" src={plusIcon} alt="Select" />
            )}
          </button>
        ) : undefined}
      </div>
      <ul className="ml-2 border-l-2 border-gray-400">
        {childNode.map((c) => (
          <li key={c.id}>
            <UITreeNode
              id={c.id}
              name={c.name}
              level={level + 1}
              selected={c.selected}
              prime={c.prime}
              primeSibling={c.primeSibling}
              childNode={c.childNode}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

function getUITreeNodeProps(
  shapeComposite: ShapeComposite,
  selectedIdMap: { [id: string]: true },
  lastSelectedId: string | undefined,
  selectedScope: string | undefined,
  shapeNode: TreeNode,
  level: number,
): UITreeNodeProps {
  const label = shapeComposite.getShapeStruct(shapeComposite.shapeMap[shapeNode.id].type).label;

  return {
    id: shapeNode.id,
    name: label,
    level,
    selected: !!selectedIdMap[shapeNode.id],
    prime: lastSelectedId === shapeNode.id,
    primeSibling: selectedScope === shapeNode.parentId,
    childNode: shapeNode.children.map((c) =>
      getUITreeNodeProps(shapeComposite, selectedIdMap, lastSelectedId, selectedScope, c, level + 1),
    ),
  };
}
