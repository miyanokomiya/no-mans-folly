import { useCallback, useMemo } from "react";
import { LineShape, getConnection, getLinePath, patchVertex } from "../../shapes/line";
import { BlockField } from "../atoms/BlockField";
import { PointField } from "./PointField";
import { IVec2 } from "okageo";
import { ConnectionPoint } from "../../models";
import { MultipleShapesInspector } from "./MultipleShapesInspector";

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

  const targetTmpConnections = useMemo(() => {
    return targetTmpVertices.map((_, i) => getConnection(targetTmpShape, i));
  }, [targetTmpShape, targetTmpVertices]);

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

  const targetShapes = useMemo(() => [targetShape], [targetShape]);
  const targetTmpShapes = useMemo(() => [targetTmpShape], [targetTmpShape]);

  const updateTmpShapes = useCallback(
    (patch: { [id: string]: Partial<LineShape> }) => {
      const adjusted = { ...patch[targetShape.id] };

      // Disconnect all vertices.
      if (targetShape.pConnection) {
        adjusted.pConnection = undefined;
      }
      if (targetShape.qConnection) {
        adjusted.qConnection = undefined;
      }
      if (adjusted.body) {
        adjusted.body = adjusted.body.map((b) => ({ p: b.p }));
      }

      updateTmpTargetShape(adjusted);
    },
    [targetShape, updateTmpTargetShape],
  );

  return (
    <>
      <MultipleShapesInspector
        targetShapes={targetShapes}
        targetTmpShapes={targetTmpShapes}
        commit={commit}
        updateTmpShapes={updateTmpShapes}
        readyState={readyState}
      />
      {targetShape.lineType === "elbow"
        ? undefined // Vertices of elbow line should be derived automatically.
        : targetTmpVertices.map((v, i) => (
            <BlockField key={i} label={getVertexLabel(i, targetTmpVertices.length, !!targetTmpConnections[i])}>
              <VertexField index={i} value={v} onChange={handleVertexChange} connection={targetTmpConnections[i]} />
            </BlockField>
          ))}
    </>
  );
};

interface VertexFieldProps {
  index: number;
  value: IVec2;
  onChange?: (index: number, val: IVec2, draft?: boolean) => void;
  connection?: ConnectionPoint;
}

export const VertexField: React.FC<VertexFieldProps> = ({ index, value, onChange, connection }) => {
  const handleChange = useCallback(
    (val: IVec2, draft = false) => {
      onChange?.(index, val, draft);
    },
    [index, onChange],
  );

  return <PointField value={value} onChange={handleChange} disabled={!!connection} />;
};

function getVertexLabel(index: number, size: number, connected?: boolean): string {
  let ret: string;
  switch (index) {
    case 0:
      ret = "Start";
      break;
    case size - 1:
      ret = "End";
      break;
    default:
      ret = `Body ${index}`;
  }

  return ret + (connected ? " (connected)" : "");
}
