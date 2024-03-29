import { ShapeComposite } from "../../composables/shapeComposite";
import { useShapeComposite } from "../../hooks/storeHooks";
import { TreeNode } from "../../utils/tree";

interface Props {}

export const ShapeTreePanel: React.FC<Props> = () => {
  const shapeComposite = useShapeComposite();
  const rootNodes = shapeComposite.mergedShapeTree;
  const rootNodeProps = rootNodes.map((n) => getUITreeNodenrops(shapeComposite, n, 0));

  return (
    <div>
      <ul>
        {rootNodeProps.map((n) => (
          <li key={n.id}>
            <UITreeNode id={n.id} name={n.name} level={n.level} childNode={n.childNode} />
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
}

const UITreeNode: React.FC<UITreeNodeProps> = ({ name, childNode, level }) => {
  return (
    <div className="ml-2">
      <div className="flex items-center">
        <div className="w-4 h-4 mr-1 border border-gray-400 rounded" />
        <div>{name}</div>
      </div>
      <ul className={"ml-1 border-l-2 border-gray-400" + (level === 0 && childNode.length > 0 ? "" : "")}>
        {childNode.map((c) => (
          <li key={c.id}>
            <UITreeNode id={c.id} name={c.name} level={level + 1} childNode={c.childNode} />
          </li>
        ))}
      </ul>
    </div>
  );
};

function getUITreeNodenrops(shapeComposite: ShapeComposite, shapeNode: TreeNode, level: number): UITreeNodeProps {
  const label = shapeComposite.getShapeStruct(shapeComposite.shapeMap[shapeNode.id].type).label;

  return {
    id: shapeNode.id,
    name: label,
    level,
    childNode: shapeNode.children.map((c) => getUITreeNodenrops(shapeComposite, c, level + 1)),
  };
}
