import { useCallback, useContext, useEffect, useState } from "react";
import { GroupAccordion } from "./molecules/ShapeLibraryGroup";
import { AppStateMachineContext, GetAppStateContext } from "../contexts/AppContext";
import { parseTemplateShapes } from "../utils/shapeTemplateUtil";
import { duplicateShapes } from "../shapes";
import { AffineMatrix, getRectCenter } from "okageo";
import { newShapeComposite } from "../composables/shapeComposite";

export const ShapeTemplatePanel: React.FC = () => {
  const getCtx = useContext(GetAppStateContext);
  const sm = useContext(AppStateMachineContext);

  const [selected, setSelected] = useState<string>("");
  const handleClickAccordion = useCallback((name: string) => {
    setSelected((v) => (v === name ? "" : name));
  }, []);

  const [stateLabel, setStateLabel] = useState("");
  useEffect(() => {
    return sm.watch(() => {
      setStateLabel(sm.getStateSummary().label);
    });
  }, [sm]);

  const createTemplate = useCallback(
    async (url: string) => {
      const res = await fetch(url);
      const svgText = await res.text();
      const template = parseTemplateShapes(svgText);
      if (!template) return;

      const smctx = getCtx();
      const duplicated = duplicateShapes(
        smctx.getShapeStruct,
        template.shapes,
        template.docs,
        smctx.generateUuid,
        smctx.createLastIndex(), // This is just a temprorary value and adjusted later.
        new Set(),
      );
      return duplicated;
    },
    [getCtx],
  );

  const handleIconDragStart = useCallback(
    async (url: string) => {
      const duplicated = await createTemplate(url);
      if (!duplicated) return;

      sm.handleEvent({
        type: "state",
        data: {
          name: "DroppingNewShape",
          options: duplicated,
        },
      });
    },
    [sm, createTemplate],
  );

  const handleIconClick = useCallback(
    async (url: string) => {
      const duplicated = await createTemplate(url);
      if (!duplicated) return;

      const smctx = getCtx();
      const minShapeComposite = newShapeComposite({
        getStruct: smctx.getShapeStruct,
        shapes: duplicated.shapes,
      });
      const wrapper = minShapeComposite.getWrapperRectForShapes(duplicated.shapes);
      const wrapperCenter = getRectCenter(wrapper);
      const viewCenter = getRectCenter(smctx.getViewRect());
      const affine: AffineMatrix = [1, 0, 0, 1, viewCenter.x - wrapperCenter.x, viewCenter.y - wrapperCenter.y];

      smctx.addShapes(
        duplicated.shapes.map((s) => ({ ...s, ...minShapeComposite.transformShape(s, affine) })),
        duplicated.docMap,
      );
      smctx.multiSelectShapes(duplicated.shapes.map((s) => s.id));
    },
    [getCtx, createTemplate],
  );

  return (
    <div className={"transition-opacity" + (stateLabel === "DroppingNewShape" ? " opacity-30" : "")}>
      <GroupAccordion
        selectedName={selected}
        name="Flowchart"
        type="templates"
        size="lg"
        onClick={handleClickAccordion}
        onIconDragStart={handleIconDragStart}
        onIconClick={handleIconClick}
      />
      <GroupAccordion
        selectedName={selected}
        name="Sequence"
        type="templates"
        size="lg"
        onClick={handleClickAccordion}
        onIconDragStart={handleIconDragStart}
        onIconClick={handleIconClick}
      />
    </div>
  );
};
