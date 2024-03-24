import { useCallback, useContext, useEffect, useState } from "react";
import { GroupAccordion } from "./molecules/ShapeLibraryGroup";
import { AppStateContext, AppStateMachineContext } from "../contexts/AppContext";
import { parseTemplateShapes } from "../utils/shapeTemplateUtil";
import { duplicateShapes } from "../shapes";

export const ShapeTemplatePanel: React.FC = () => {
  const smctx = useContext(AppStateContext);
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

  const handleIconDown = useCallback(
    async (url: string) => {
      const res = await fetch(url);
      const svgText = await res.text();
      const template = parseTemplateShapes(svgText);
      if (!template) return;

      const duplicated = duplicateShapes(
        smctx.getShapeStruct,
        template.shapes,
        template.docs,
        smctx.generateUuid,
        smctx.createLastIndex(), // This is just a temprorary value and adjusted later.
        new Set(),
      );
      sm.handleEvent({
        type: "state",
        data: {
          name: "DroppingNewShape",
          options: duplicated,
        },
      });
    },
    [sm, smctx],
  );

  return (
    <div className={"transition-opacity" + (stateLabel === "DroppingNewShape" ? " opacity-30" : "")}>
      <GroupAccordion
        selectedName={selected}
        name="Sequence"
        type="templates"
        size="lg"
        onClick={handleClickAccordion}
        onIconDown={handleIconDown}
      />
    </div>
  );
};
