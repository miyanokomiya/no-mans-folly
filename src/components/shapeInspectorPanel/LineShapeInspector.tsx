import { useCallback, useMemo } from "react";
import { LineShape, getLinePath, patchVertex } from "../../shapes/line";
import { BlockField } from "../atoms/BlockField";
import { PointField } from "./PointField";
import { IVec2 } from "okageo";

interface Props {
  targetShape: LineShape;
  targetTmpShape: LineShape;
  commit: () => void;
  updateTmpTargetShape: (patch: Partial<LineShape>) => void;
  readyState: () => void;
}

export const LineShapeInspector: React.FC<Props> = ({
  targetShape,
  targetTmpShape,
  commit,
  updateTmpTargetShape,
  readyState,
}) => {
  const targetTmpVertices = useMemo(() => {
    return getLinePath(targetTmpShape);
  }, [targetTmpShape]);

  const handleVertexChange = useCallback(
    (index: number, val: IVec2, draft = false) => {
      if (draft) {
        readyState();

        updateTmpTargetShape(patchVertex(targetShape, index, val, undefined));
      } else {
        commit();
      }
    },
    [commit, readyState, updateTmpTargetShape, targetShape],
  );

  return (
    <>
      {targetTmpVertices.map((v, i) => (
        <BlockField key={i} label={getVertexLabel(i, targetTmpVertices.length)}>
          <VertexField index={i} value={v} onChange={handleVertexChange} />
        </BlockField>
      ))}
    </>
  );
};

interface VertexFieldProps {
  index: number;
  value: IVec2;
  onChange?: (index: number, val: IVec2, draft?: boolean) => void;
}

export const VertexField: React.FC<VertexFieldProps> = ({ index, value, onChange }) => {
  const handleChange = useCallback(
    (val: IVec2, draft = false) => {
      onChange?.(index, val, draft);
    },
    [index, onChange],
  );

  return <PointField value={value} onChange={handleChange} />;
};

function getVertexLabel(index: number, size: number): string {
  switch (index) {
    case 0:
      return "Start";
    case size - 1:
      return "End";
    default:
      return `Body ${index}`;
  }
}
