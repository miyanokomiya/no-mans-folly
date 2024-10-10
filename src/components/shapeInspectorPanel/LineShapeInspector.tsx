import { useCallback, useMemo } from "react";
import { LineShape, detachVertex, getConnection, getLinePath, patchVertex } from "../../shapes/line";
import { BlockField } from "../atoms/BlockField";
import { PointField } from "./PointField";
import { IVec2 } from "okageo";
import { ConnectionPoint } from "../../models";
import { MultipleShapesInspector } from "./MultipleShapesInspector";
import iconLineDetach from "../../assets/icons/line_detach.svg";

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

  const handleDetachClick = useCallback(
    (index: number) => {
      updateTmpTargetShape(detachVertex(targetShape, index));
      commit();
    },
    [targetShape, updateTmpTargetShape, commit],
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
      {targetShape.lineType === "elbow" ? undefined : ( // Vertices of elbow line should be derived automatically.
        <BlockField label="Vertices">
          <div className="w-full flex flex-col gap-1">
            {targetTmpVertices.map((v, i) => (
              <VertexField
                key={i}
                index={i}
                value={v}
                onChange={handleVertexChange}
                connection={targetTmpConnections[i]}
                onDetachClick={handleDetachClick}
              />
            ))}
          </div>
        </BlockField>
      )}
    </>
  );
};

interface VertexFieldProps {
  index: number;
  value: IVec2;
  onChange?: (index: number, val: IVec2, draft?: boolean) => void;
  connection?: ConnectionPoint;
  onDetachClick?: (index: number) => void;
}

export const VertexField: React.FC<VertexFieldProps> = ({ index, value, onChange, connection, onDetachClick }) => {
  const handleChange = useCallback(
    (val: IVec2, draft = false) => {
      onChange?.(index, val, draft);
    },
    [index, onChange],
  );

  const handleDetachClick = useCallback(() => {
    onDetachClick?.(index);
  }, [index, onDetachClick]);

  return (
    <div className="flex items-center justify-end">
      {connection ? (
        <button type="button" className="mr-2 p-1 border rounded" title="Detach" onClick={handleDetachClick}>
          <img className="w-6 h-6" src={iconLineDetach} alt="Detach vertex" />
        </button>
      ) : undefined}
      <PointField value={value} onChange={handleChange} disabled={!!connection} />
    </div>
  );
};
