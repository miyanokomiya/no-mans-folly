import { useCallback, useContext, useEffect, useState } from "react";
import { GroupAccordion } from "./molecules/ShapeLibraryGroup";
import { AppStateContext, AppStateMachineContext } from "../contexts/AppContext";
import { createShape } from "../shapes";
import { ImageShape } from "../shapes/image";

export const ShapeLibraryPanel: React.FC = () => {
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
    async (url: string, id: string) => {
      const imageStore = smctx.getImageStore();
      const assetAPI = smctx.assetAPI;
      if (assetAPI.enabled) {
        const loadAsset = async () => {
          const image = imageStore.getImage(id);
          if (!image) {
            // When the asset isn't yet stored, fetch and save it.
            let blob: Blob;
            try {
              blob = await imageStore.lazyLoadFromFile(id, async () => {
                const res = await fetch(url);
                return res.blob();
              });
            } catch (e) {
              console.error(e);
              imageStore.removeImage(id);
              smctx.showToastMessage({ text: "Failed to load asset file.", type: "error" });
              return;
            }

            try {
              await assetAPI.saveAsset(id, blob);
            } catch (e) {
              console.error(e);
              imageStore.removeImage(id);
              smctx.showToastMessage({ text: "Failed to save asset file.", type: "error" });
            }
          }
        };

        // Fetch, load and save the asset without waiting.
        loadAsset();

        const template = {
          shapes: [
            createShape<ImageShape>(smctx.getShapeStruct, "image", {
              id: smctx.generateUuid(),
              findex: smctx.createLastIndex(),
              width: 50,
              height: 50,
              assetId: id,
            }),
          ],
        };

        sm.handleEvent({
          type: "state",
          data: {
            name: "DroppingNewShape",
            options: template,
          },
        });
      } else {
        smctx.showToastMessage({ text: "Sync workspace to enable asset files.", type: "error" });
      }
    },
    [sm, smctx],
  );

  return (
    <div className={"transition-opacity" + (stateLabel === "DroppingNewShape" ? " opacity-30" : "")}>
      <GroupAccordion
        selectedName={selected}
        name="AWS"
        type="shapes"
        onClick={handleClickAccordion}
        onIconDown={handleIconDown}
      />
      <GroupAccordion
        selectedName={selected}
        name="GCP"
        type="shapes"
        onClick={handleClickAccordion}
        onIconDown={handleIconDown}
      />
    </div>
  );
};
