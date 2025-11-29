import { useCallback, useContext, useEffect, useState } from "react";
import { GroupAccordion } from "./molecules/ShapeLibraryGroup";
import { AppStateMachineContext, GetAppStateContext } from "../contexts/AppContext";
import { parseTemplateShapes } from "../shapes/utils/shapeTemplateUtil";
import { AffineMatrix, getRectCenter } from "okageo";
import { newShapeComposite } from "../composables/shapeComposite";
import { duplicateShapes } from "../shapes/utils/duplicator";
import { getSymbolAssetMigrationInfo } from "../shapes/utils/symbol";

const TEMPLATE_LIST = ["Flowchart", "Sequence", "Presentation", "Misc"];

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

  const saveTemplateAssets = useCallback(
    async (assets: [string, Blob][]) => {
      const smctx = getCtx();
      const assetAPI = smctx.assetAPI;
      const imageStore = smctx.getImageStore();
      const unstored = assets.filter(([id]) => imageStore.getImage(id));
      const saved: [string, Blob][] = [];

      for (const [id, blob] of unstored) {
        try {
          await assetAPI.saveAsset(id, blob);
          saved.push([id, blob]);
        } catch (e) {
          console.error(e);
          smctx.showToastMessage({ text: "Failed to save asset file.", type: "error" });
        }
      }

      for (const [id, blob] of saved) {
        try {
          await imageStore.loadFromFile(id, blob);
        } catch (e) {
          console.error(e);
          smctx.showToastMessage({ text: "Failed to load asset files.", type: "warn" });
        }
      }
    },
    [getCtx],
  );

  const createTemplate = useCallback(
    async (url: string) => {
      const res = await fetch(url);
      const svgText = await res.text();
      const template = parseTemplateShapes(svgText);
      if (!template) return;

      const smctx = getCtx();
      const symbolAssetMigrationInfo = await getSymbolAssetMigrationInfo(template.shapes);

      if (template.assets) {
        const adjustedAssets = template.assets.map<[string, Blob]>((info) => [
          symbolAssetMigrationInfo.assetIdMigrationMap.get(info[0]) ?? info[0],
          info[1],
        ]);
        // Save assets asynchronously.
        saveTemplateAssets(adjustedAssets);
      }

      const adjustedShapes = template.shapes.map((s) => {
        const patch = symbolAssetMigrationInfo.patch[s.id];
        return patch ? { ...s, ...patch } : s;
      });

      const duplicated = duplicateShapes(
        smctx.getShapeStruct,
        adjustedShapes,
        template.docs,
        smctx.generateUuid,
        smctx.createLastIndex(), // This is just a temprorary value and adjusted later.
        new Set(),
      );
      return duplicated;
    },
    [getCtx, saveTemplateAssets],
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
      {TEMPLATE_LIST.map((name) => (
        <GroupAccordion
          key={name}
          selectedName={selected}
          name={name}
          label={name}
          type="templates"
          size="lg"
          onClick={handleClickAccordion}
          onIconDragStart={handleIconDragStart}
          onIconClick={handleIconClick}
        />
      ))}
    </div>
  );
};
