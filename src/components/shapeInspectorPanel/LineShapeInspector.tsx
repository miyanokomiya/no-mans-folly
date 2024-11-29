import { useCallback, useMemo } from "react";
import { CurveType, LineShape, detachVertex, getConnection, getLinePath, patchVertex } from "../../shapes/line";
import { PointField } from "./PointField";
import { IVec2 } from "okageo";
import { ConnectionPoint, CurveControl } from "../../models";
import { MultipleShapesInspector } from "./MultipleShapesInspector";
import iconLineDetach from "../../assets/icons/line_detach.svg";
import { HighlightShapeMeta } from "../../composables/states/appCanvas/core";
import { BlockGroupField } from "../atoms/BlockGroupField";
import { isArcControl, isBezieirControl } from "../../utils/path";
import { InlineField } from "../atoms/InlineField";
import { NumberInput } from "../atoms/inputs/NumberInput";

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
  const targetTmpCurves = targetTmpShape.curves;

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

  const handleCurveChange = useCallback(
    (index: number, val: CurveControl, draft = false) => {
      if (draft) {
        readyState();

        const curves = targetShape.curves?.concat();
        if (!curves) return;

        curves[index] = val;
        updateTmpTargetShape({ curves });
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

  const highlightShape = useCallback(
    (meta: HighlightShapeMeta) => {
      highlighShape(meta);
    },
    [highlighShape],
  );

  const handleVertexLeave = useCallback(() => {
    highlightShape({ type: "vertex", index: -1 });
  }, [highlightShape]);

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
                connection={targetTmpConnections[i]}
                curve={targetTmpCurves?.[i]}
                curveType={targetShape.curveType}
                onChange={handleVertexChange}
                onCurveChange={handleCurveChange}
                onDetachClick={handleDetachClick}
                highlightShape={highlightShape}
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
  connection?: ConnectionPoint;
  curve?: CurveControl;
  curveType?: CurveType;
  onChange?: (index: number, val: IVec2, draft?: boolean) => void;
  onCurveChange?: (index: number, val: CurveControl, draft?: boolean) => void;
  onDetachClick?: (index: number) => void;
  highlightShape?: (meta: HighlightShapeMeta) => void;
}

export const VertexField: React.FC<VertexFieldProps> = ({
  index,
  value,
  connection,
  curve,
  curveType,
  onChange,
  onCurveChange,
  onDetachClick,
  highlightShape,
}) => {
  const handleChange = useCallback(
    (val: IVec2, draft = false) => {
      onChange?.(index, val, draft);
    },
    [index, onChange],
  );

  const handleBezierC1Change = useCallback(
    (val: IVec2, draft = false) => {
      if (!isBezieirControl(curve)) return;
      onCurveChange?.(index, { c1: val, c2: curve.c2 }, draft);
    },
    [index, curve, onCurveChange],
  );

  const handleBezierC2Change = useCallback(
    (val: IVec2, draft = false) => {
      if (!isBezieirControl(curve)) return;
      onCurveChange?.(index, { c1: curve.c1, c2: val }, draft);
    },
    [index, curve, onCurveChange],
  );

  const handleArcChange = useCallback(
    (val: number, draft = false) => {
      if (!isArcControl(curve)) return;
      onCurveChange?.(index, { d: { x: 0, y: val } }, draft);
    },
    [index, curve, onCurveChange],
  );
  const handleArcChangeCommit = useCallback(() => {
    if (!curve) return;
    onCurveChange?.(index, curve);
  }, [index, curve, onCurveChange]);

  const handleDetachClick = useCallback(() => {
    onDetachClick?.(index);
  }, [index, onDetachClick]);

  const handleVertexEnter = useCallback(() => {
    highlightShape?.({ type: "vertex", index });
  }, [index, highlightShape]);

  const handleSegmentEnter = useCallback(() => {
    highlightShape?.({ type: "segment", index });
  }, [index, highlightShape]);

  const handleBezierC1Enter = useCallback(() => {
    highlightShape?.({ type: "bezier-anchor", index, subIndex: 0 });
  }, [index, highlightShape]);

  const handleBezierC2Enter = useCallback(() => {
    highlightShape?.({ type: "bezier-anchor", index, subIndex: 1 });
  }, [index, highlightShape]);

  const vertexField = (
    <div className="flex items-center justify-end" onPointerEnter={handleVertexEnter}>
      {connection ? (
        <button type="button" className="mr-2 p-1 flex-1 border rounded" title="Detach" onClick={handleDetachClick}>
          <img className="w-6 h-6" src={iconLineDetach} alt="Detach vertex" />
        </button>
      ) : undefined}
      <PointField value={value} onChange={handleChange} disabled={!!connection} />
    </div>
  );

  if (isBezieirControl(curve)) {
    const editableCurve = curveType !== "auto";
    return (
      <BlockGroupField label="Bezier">
        {vertexField}
        <div>
          <div onPointerEnter={handleBezierC1Enter}>
            <InlineField label="c1" inert={!editableCurve}>
              <PointField value={curve.c1} onChange={handleBezierC1Change} />
            </InlineField>
          </div>
          <div onPointerEnter={handleBezierC2Enter}>
            <InlineField label="c2" inert={!editableCurve}>
              <PointField value={curve.c2} onChange={handleBezierC2Change} />
            </InlineField>
          </div>
        </div>
      </BlockGroupField>
    );
  }

  if (isArcControl(curve)) {
    return (
      <BlockGroupField label="Arc">
        {vertexField}
        <div onPointerEnter={handleSegmentEnter}>
          <InlineField label="radius">
            <div className="w-24">
              <NumberInput
                value={curve.d.y}
                onChange={handleArcChange}
                onBlur={handleArcChangeCommit}
                keepFocus
                slider
              />
            </div>
          </InlineField>
        </div>
      </BlockGroupField>
    );
  }

  return vertexField;
};
