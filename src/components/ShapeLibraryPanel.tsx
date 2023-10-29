import { useCallback, useContext, useEffect, useState } from "react";
import { ShapeLibraryGroup } from "./molecules/ShapeLibraryGroup";
import { AppStateContext, AppStateMachineContext } from "../contexts/AppContext";
import { createShape } from "../shapes";
import { ImageShape } from "../shapes/image";

interface Props {}

export const ShapeLibraryPanel: React.FC<Props> = () => {
  const smctx = useContext(AppStateContext);
  const sm = useContext(AppStateMachineContext);

  const [selected, setSelected] = useState<"" | "aws">("");
  const [stateLabel, setStateLabel] = useState("");
  useEffect(() => {
    return sm.watch(() => {
      setStateLabel(sm.getStateSummary().label);
    });
  }, [sm]);

  const handleClickAws = useCallback(() => {
    setSelected("aws");
  }, []);

  const handleIconDown = useCallback(
    async (url: string, id: string) => {
      const imageStore = smctx.getImageStore();
      const assetAPI = smctx.getAssetAPI();
      if (assetAPI.enabled) {
        const image = imageStore.getImage(id);
        if (!image) {
          // When the asset isn't yet stored, fetch and save it.
          try {
            const res = await fetch(url);
            const blob = await res.blob();
            await assetAPI.saveAsset(id, blob);
            await imageStore.loadFromFile(id, blob);
          } catch (e) {
            smctx.showToastMessage({ text: "Failed to save asset file.", type: "error" });
            return;
          }
        }

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
      <div>
        <button type="button" onClick={handleClickAws} className="border rounded p-2 w-full text-left">
          AWS
        </button>
        {selected ? (
          <div className="pl-2">
            <ShapeLibraryGroup name="aws" onIconDown={handleIconDown} />
          </div>
        ) : undefined}
      </div>
    </div>
  );
};
