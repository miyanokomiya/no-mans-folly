import { useCallback, useContext, useEffect, useRef } from "react";
import { ShapeComposite } from "../../composables/shapeComposite";
import { useSelectedShapeInfo, useShapeComposite } from "../../hooks/storeHooks";
import { TreeNode } from "../../utils/tree";
import { AppStateContext } from "../../contexts/AppContext";

interface Props {}

export const ShapeTreePanel: React.FC<Props> = () => {
  const shapeComposite = useShapeComposite();
  const selectedInfo = useSelectedShapeInfo();
  const rootNodes = shapeComposite.mergedShapeTree;
  const rootNodeProps = rootNodes.map((n) =>
    getUITreeNodeProps(shapeComposite, selectedInfo.idMap, selectedInfo.lastId, n, 0),
  );

  const { selectShape } = useContext(AppStateContext);

  const handleClickNode = useCallback(
    (id: string) => {
      selectShape(id);
    },
    [selectShape],
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
              childNode={n.childNode}
              onClick={handleClickNode}
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
  onClick: (id: string) => void;
}

const UITreeNode: React.FC<UITreeNodeProps> = ({ id, name, childNode, level, selected, prime, onClick }) => {
  const selectedClass = prime ? " bg-red-300 font-bold" : selected ? " bg-yellow-300 font-bold" : "";

  const handleClickNode = useCallback(() => {
    onClick(id);
  }, [id, onClick]);

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!prime || !rootRef.current) return;

    rootRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [prime]);

  return (
    <div ref={rootRef} className="ml-2">
      <div className="flex items-center">
        <div className="w-4 h-4 mr-1 border border-gray-400 rounded" />
        <button type="button" className={"px-1 rounded w-full text-left" + selectedClass} onClick={handleClickNode}>
          {name}
        </button>
      </div>
      <ul className={"ml-1 border-l-2 border-gray-400" + (level === 0 && childNode.length > 0 ? "" : "")}>
        {childNode.map((c) => (
          <li key={c.id}>
            <UITreeNode
              id={c.id}
              name={c.name}
              level={level + 1}
              selected={c.selected}
              prime={c.prime}
              childNode={c.childNode}
              onClick={onClick}
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
    childNode: shapeNode.children.map((c) =>
      getUITreeNodeProps(shapeComposite, selectedIdMap, lastSelectedId, c, level + 1),
    ),
  };
}
