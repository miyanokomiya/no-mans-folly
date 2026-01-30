import { useCallback, useContext, useMemo } from "react";
import { useSelectedShape, useSelectedTmpShape, useShapeComposite, useShapeSelectedMap } from "../../hooks/storeHooks";
import { ConventionalShapeInspector } from "./ConventionalShapeInspector";
import { getPatchByLayouts } from "../../composables/shapeLayoutHandler";
import { InlineField } from "../atoms/InlineField";
import { AppStateContext, AppStateMachineContext, GetAppStateContext } from "../../contexts/AppContext";
import { Shape, ShapeAttachment } from "../../models";
import { LineShapeInspector } from "./LineShapeInspector";
import { LineShape, isLineShape } from "../../shapes/line";
import { GroupConstraintInspector } from "./GroupConstraintInspector";
import { TableConstraintInspector } from "./TableConstraintInspector";
import { MultipleShapesInspector } from "./MultipleShapesInspector";
import { canClip, canShapeGrouped } from "../../shapes";
import { GroupShape, isGroupShape } from "../../shapes/group";
import { ClipInspector } from "./ClipInspector";
import { AlphaField } from "./AlphaField";
import { HighlightShapeMeta } from "../../composables/states/appCanvas/core";
import { AttachmentInspector } from "./AttachmentInspector";
import { patchByPartialProperties } from "../../utils/entities";
import { SheetInspectorPanel } from "./SheetInspectorPanel";
import { ShapeSelectionPanel } from "./ShapeSelectionPanel";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { BlockGroupField } from "../atoms/BlockGroupField";
import { AppText } from "../molecules/AppText";

export const ShapeInspectorPanel: React.FC = () => {
  const targetShape = useSelectedShape();

  return targetShape ? (
    <div className="flex flex-col gap-2">
      <ShapeSelectionPanel />
      <ShapeInspectorPanelWithShape targetShape={targetShape} />
    </div>
  ) : (
    <SheetInspectorPanel />
  );
};

interface ShapeInspectorPanelWithShapeProps {
  targetShape: Shape;
}

const ShapeInspectorPanelWithShape: React.FC<ShapeInspectorPanelWithShapeProps> = ({ targetShape }) => {
  const { handleEvent } = useContext(AppStateMachineContext);
  const { getTmpShapeMap, setTmpShapeMap, patchShapes, getShapeComposite } = useContext(GetAppStateContext)();
  const targetTmpShape = useSelectedTmpShape() ?? targetShape;

  const shapeComposite = useShapeComposite();
  const selectedMap = useShapeSelectedMap();
  const targetShapes = useMemo(() => {
    return Object.keys(selectedMap).map((id) => shapeComposite.shapeMap[id]);
  }, [shapeComposite, selectedMap]);
  const targetTmpShapes = useMemo(() => {
    return Object.keys(selectedMap).map((id) => shapeComposite.mergedShapeMap[id]);
  }, [shapeComposite, selectedMap]);

  const readyState = useCallback(() => {
    handleEvent({
      type: "state",
      data: { name: "ShapeInspection" },
    });
  }, [handleEvent]);

  const breakState = useCallback(() => {
    handleEvent({
      type: "state",
      data: { name: "Break" },
    });
  }, [handleEvent]);

  const highlighShape = useCallback(
    (meta: HighlightShapeMeta) => {
      handleEvent({
        type: "shape-highlight",
        data: { id: targetShape.id, meta },
      });
    },
    [targetShape, handleEvent],
  );

  /**
   * Expected behavior of input field.
   * - Update tmp data during inputting text/number manually.
   * - Commit tmp data on input blur.
   * - Commit tmp data on form submit.
   * - Update tmp data during manipulating a slider.
   * - Commit tmp data on slider mouseup.
   */
  const commit = useCallback(() => {
    const tmp = getTmpShapeMap();
    if (Object.keys(tmp).length > 0) {
      setTmpShapeMap({});
      patchShapes(tmp);
    }
    breakState();
  }, [getTmpShapeMap, setTmpShapeMap, patchShapes, breakState]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      commit();
    },
    [commit],
  );

  const updateTmpTargetShape = useCallback(
    (patch: Partial<Shape>) => {
      const shapeComposite = getShapeComposite();
      const layoutPatch = getPatchByLayouts(shapeComposite, {
        update: { [targetShape.id]: patch },
      });
      setTmpShapeMap(layoutPatch);
    },
    [targetShape, getShapeComposite, setTmpShapeMap],
  );

  const updateTmpShapes = useCallback(
    (patch: { [id: string]: Partial<Shape> }) => {
      const shapeComposite = getShapeComposite();
      const layoutPatch = getPatchByLayouts(shapeComposite, {
        update: patch,
      });
      setTmpShapeMap(layoutPatch);
    },
    [getShapeComposite, setTmpShapeMap],
  );

  // Intended for patching common attributes rather than transforming.
  const updateTargetShapesBySamePatch = useCallback(
    (patch: Partial<Shape>, draft = false) => {
      const shapeComposite = getShapeComposite();

      const layoutPatch = getPatchByLayouts(shapeComposite, {
        update: targetShapes.reduce<{ [id: string]: Partial<Shape> }>((p, s) => {
          p[s.id] = patch;
          return p;
        }, {}),
      });

      if (draft) {
        setTmpShapeMap(layoutPatch);
      } else {
        setTmpShapeMap({});
        patchShapes(layoutPatch);
      }
    },
    [targetShapes, getShapeComposite, patchShapes, setTmpShapeMap],
  );

  const updateGroupShapesBySamePatch = useCallback(
    (patch: Partial<GroupShape>) => {
      const shapeComposite = getShapeComposite();

      const layoutPatch = getPatchByLayouts(shapeComposite, {
        update: targetShapes.reduce<{ [id: string]: Partial<Shape> }>((p, s) => {
          if (!isGroupShape(s)) return p;
          p[s.id] = patch;
          return p;
        }, {}),
      });
      patchShapes(layoutPatch);
    },
    [targetShapes, getShapeComposite, patchShapes],
  );

  const lineAttached = shapeComposite.attached(targetShape, "line");

  // Only shapes already having "attachment" will be updated.
  // Either shapes having line attachments or shape attachments will be udpated.
  const updateAttachmentBySamePatch = useCallback(
    (val: Partial<ShapeAttachment>, draft = false) => {
      const shapeComposite = getShapeComposite();

      const updateTargets = targetShapes.filter((s) => shapeComposite.attached(s, lineAttached ? "line" : "shape"));
      const layoutPatch = getPatchByLayouts(shapeComposite, {
        update: updateTargets.reduce<{ [id: string]: Partial<Shape> }>((p, s) => {
          if (s.attachment) {
            p[s.id] = patchByPartialProperties(s, { attachment: val });
          }
          return p;
        }, {}),
      });

      if (draft) {
        setTmpShapeMap(layoutPatch);
      } else {
        setTmpShapeMap({});
        patchShapes(layoutPatch);
      }
    },
    [targetShapes, getShapeComposite, patchShapes, setTmpShapeMap, lineAttached],
  );

  const handleNoExportChange = useCallback(
    (checked: boolean) => {
      updateTargetShapesBySamePatch({ noExport: checked });
    },
    [updateTargetShapesBySamePatch],
  );

  const handleLockedChange = useCallback(
    (checked: boolean) => {
      updateTargetShapesBySamePatch({ locked: checked });
    },
    [updateTargetShapesBySamePatch],
  );

  const handleNoBoundsChange = useCallback(
    (checked: boolean) => {
      updateTargetShapesBySamePatch({ noBounds: checked });
    },
    [updateTargetShapesBySamePatch],
  );

  const statusField = (
    <BlockGroupField label="Status" accordionKey="inspector-status">
      <AlphaField targetTmpShape={targetTmpShape} updateTargetShape={updateTargetShapesBySamePatch} />
      <InlineField label="Locked">
        <ToggleInput value={targetTmpShape.locked ?? false} onChange={handleLockedChange} />
      </InlineField>
      <InlineField label="No export">
        <ToggleInput value={targetTmpShape.noExport ?? false} onChange={handleNoExportChange} />
      </InlineField>
      <InlineField label={<AppText portal>[[NOBOUNDS]]</AppText>}>
        <ToggleInput value={targetTmpShape.noBounds ?? false} onChange={handleNoBoundsChange} />
      </InlineField>
    </BlockGroupField>
  );

  const groupConstraintField = shapeComposite.isInTableCell(targetShape) ? (
    <TableConstraintInspector targetShape={targetShape} updateTargetShape={updateTargetShapesBySamePatch} />
  ) : canShapeGrouped(shapeComposite.getShapeStruct, targetShape) ? (
    <GroupConstraintInspector targetShape={targetShape} updateTargetShape={updateTargetShapesBySamePatch} />
  ) : undefined;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {targetShapes.length >= 2 ? (
        <>
          {statusField}
          <MultipleShapesInspector
            targetShapes={targetShapes}
            targetTmpShapes={targetTmpShapes}
            commit={commit}
            updateTmpShapes={updateTmpShapes}
            readyState={readyState}
          />
        </>
      ) : (
        <>
          <ShapeTypeBlock type={targetShape.type} />
          {statusField}
          {isLineShape(targetShape) ? (
            <LineShapeInspector
              targetShape={targetShape}
              targetTmpShape={targetTmpShape as LineShape}
              commit={commit}
              updateTmpTargetShape={updateTmpTargetShape}
              readyState={readyState}
              highlighShape={highlighShape}
            />
          ) : (
            <ConventionalShapeInspector
              targetShape={targetShape}
              targetTmpShape={targetTmpShape}
              commit={commit}
              updateTmpShapes={updateTmpShapes}
              readyState={readyState}
            />
          )}
        </>
      )}
      {groupConstraintField}
      {canClip(shapeComposite.getShapeStruct, targetShape) ? (
        <ClipInspector
          targetShape={targetShape}
          updateTargetShape={updateTargetShapesBySamePatch}
          updateTargetGroupShape={updateGroupShapesBySamePatch}
        />
      ) : undefined}
      <AttachmentInspector
        targetShape={targetShape}
        targetTmpShape={targetTmpShape}
        lineAttached={lineAttached}
        updateAttachment={updateAttachmentBySamePatch}
        commit={commit}
        readyState={readyState}
      />
      <button type="submit" className="hidden" />
    </form>
  );
};

interface ShapeTypeBlockProps {
  type: string;
}

const ShapeTypeBlock: React.FC<ShapeTypeBlockProps> = ({ type }) => {
  const { getShapeComposite } = useContext(AppStateContext);
  const shapeComposite = getShapeComposite();
  const shapeLabel = shapeComposite.getShapeStruct(type).label;

  return (
    <InlineField label="Shape type">
      <span>{shapeLabel}</span>
    </InlineField>
  );
};
