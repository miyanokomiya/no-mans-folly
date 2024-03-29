import { ShapeComposite } from "../../composables/shapeComposite";
import { useSelectedShapeInfo, useShapeComposite } from "../../hooks/storeHooks";
import { TreeNode } from "../../utils/tree";

interface Props {}

export const ShapeTreePanel: React.FC<Props> = () => {
  const shapeComposite = useShapeComposite();
  const selectedInfo = useSelectedShapeInfo();
  const rootNodes = shapeComposite.mergedShapeTree;
  const rootNodeProps = rootNodes.map((n) =>
    getUITreeNodeProps(shapeComposite, selectedInfo.idMap, selectedInfo.lastId, n, 0),
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
}

const UITreeNode: React.FC<UITreeNodeProps> = ({ name, childNode, level, selected, prime }) => {
  const selectedClass = prime ? " bg-red-300 font-bold" : selected ? " bg-yellow-300 font-bold" : "";

  return (
    <div className="ml-2">
      <div className="flex items-center">
        <div className="w-4 h-4 mr-1 border border-gray-400 rounded" />
        <div className={"px-1 rounded" + selectedClass}>{name}</div>
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
