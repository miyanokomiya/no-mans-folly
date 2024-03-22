import { useCallback, useContext, useEffect, useState } from "react";
import { ShapeLibraryGroup } from "./molecules/ShapeLibraryGroup";
import { AppStateContext, AppStateMachineContext } from "../contexts/AppContext";
import { createShape } from "../shapes";
import { ImageShape } from "../shapes/image";

interface Props {}

export const ShapeLibraryPanel: React.FC<Props> = () => {
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
      <GroupAccordion selectedName={selected} name="AWS" onClick={handleClickAccordion} onIconDown={handleIconDown} />
      <GroupAccordion selectedName={selected} name="GCP" onClick={handleClickAccordion} onIconDown={handleIconDown} />
    </div>
  );
};

interface GroupAccordionProps {
  selectedName: string;
  name: string;
  onClick?: (name: string) => void;
  onIconDown?: (url: string, id: string) => void;
}

export const GroupAccordion: React.FC<GroupAccordionProps> = ({ selectedName, name, onClick, onIconDown }) => {
  const handleClick = useCallback(() => {
    onClick?.(name);
  }, [name, onClick]);

  return (
    <div>
      <button type="button" onClick={handleClick} className="border rounded p-2 w-full text-left">
        {name}
      </button>
      {selectedName === name ? (
        <div className="pl-2">
          <ShapeLibraryGroup name={name.toLowerCase()} onIconDown={onIconDown} />
        </div>
      ) : undefined}
    </div>
  );
};
