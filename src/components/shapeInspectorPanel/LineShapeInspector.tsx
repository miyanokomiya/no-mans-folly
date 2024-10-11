import { useCallback, useMemo } from "react";
import { LineShape, detachVertex, getConnection, getLinePath, patchVertex } from "../../shapes/line";
import { PointField } from "./PointField";
import { IVec2 } from "okageo";
import { ConnectionPoint } from "../../models";
import { MultipleShapesInspector } from "./MultipleShapesInspector";
import iconLineDetach from "../../assets/icons/line_detach.svg";
import { HighlightShapeMeta } from "../../composables/states/appCanvas/core";
import { BlockGroupField } from "../atoms/BlockGroupField";

interface Props {
  targetShape: LineShape;
  targetTmpShape: LineShape;
  commit: () => void;
  updateTmpTargetShape: (patch: Partial<LineShape>) => void;
  readyState: () => void;
  highlighShape: (meta: HighlightShapeMeta) => void;
}

export const LineShapeInspector: React.FC<Props> = ({
  targetShape,
  targetTmpShape,
  commit,
  updateTmpTargetShape,
  readyState,
  highlighShape,
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

  const handleVertexHover = useCallback(
    (index: number) => {
      highlighShape({ type: "vertex", index });
    },
    [highlighShape],
  );

  const handleVertexLeave = useCallback(() => {
    handleVertexHover(-1);
  }, [handleVertexHover]);

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
        <BlockGroupField label="Vertices" accordionKey="line-vertices">
          <div className="w-full flex flex-col gap-1" onPointerLeave={handleVertexLeave}>
            {targetTmpVertices.map((v, i) => (
              <VertexField
                key={i}
                index={i}
                value={v}
                onChange={handleVertexChange}
                connection={targetTmpConnections[i]}
                onDetachClick={handleDetachClick}
                onEnter={handleVertexHover}
              />
            ))}
          </div>
        </BlockGroupField>
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
  onEnter?: (index: number) => void;
}

export const VertexField: React.FC<VertexFieldProps> = ({
  index,
  value,
  onChange,
  connection,
  onDetachClick,
  onEnter,
}) => {
  const handleChange = useCallback(
    (val: IVec2, draft = false) => {
      onChange?.(index, val, draft);
    },
    [index, onChange],
  );

  const handleDetachClick = useCallback(() => {
    onDetachClick?.(index);
  }, [index, onDetachClick]);

  const handleEnter = useCallback(() => {
    onEnter?.(index);
  }, [index, onEnter]);

  return (
    <div className="flex items-center justify-end" onPointerEnter={handleEnter}>
      {connection ? (
        <button type="button" className="mr-2 p-1 border rounded" title="Detach" onClick={handleDetachClick}>
          <img className="w-6 h-6" src={iconLineDetach} alt="Detach vertex" />
        </button>
      ) : undefined}
      <PointField value={value} onChange={handleChange} disabled={!!connection} />
    </div>
  );
};
