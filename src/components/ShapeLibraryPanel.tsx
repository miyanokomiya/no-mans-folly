import { useCallback, useContext, useEffect, useState } from "react";
import { GroupAccordion } from "./molecules/ShapeLibraryGroup";
import { AppStateMachineContext, GetAppStateContext } from "../contexts/AppContext";
import { createShape } from "../shapes";
import { ImageShape } from "../shapes/image";
import { newShapeComposite } from "../composables/shapeComposite";
import { AffineMatrix, getRectCenter } from "okageo";
import { Size } from "../models";

const ICON_GROUPS = [
  { name: "AWS", label: "AWS", url: "https://aws.amazon.com/architecture/icons/" },
  {
    name: "Cisco",
    label: "Cisco",
    url: "https://www.cisco.com/c/en/us/about/brand-center/network-topology-icons.html",
  },
  { name: "GCP", label: "Google Cloud", url: "https://cloud.google.com/icons" },
];

export const ShapeLibraryPanel: React.FC = () => {
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
    async (url: string, id: string, size: Size) => {
      const smctx = getCtx();
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

        // FIXME: Use original size of the icon rather than adjusting here.
        // Proportional size is intended for AWS and GCP, unproportional size is intended for Cisco that has quite inconsistent sized icons.
        const shapeSize = size.width === size.height ? { width: 50, height: 50 } : size;

        const template = {
          shapes: [
            createShape<ImageShape>(smctx.getShapeStruct, "image", {
              id: smctx.generateUuid(),
              findex: smctx.createLastIndex(),
              width: shapeSize.width,
              height: shapeSize.height,
              assetId: id,
            }),
          ],
        };
        return template;
      } else {
        smctx.showToastMessage({ text: "Sync workspace to enable asset files.", type: "error" });
      }
    },
    [getCtx],
  );

  const handleIconDragStart = useCallback(
    async (url: string, id: string, size: Size) => {
      const template = await createTemplate(url, id, size);
      if (!template) return;

      sm.handleEvent({
        type: "state",
        data: {
          name: "DroppingNewShape",
          options: template,
        },
      });
    },
    [sm, createTemplate],
  );

  const handleIconClick = useCallback(
    async (url: string, id: string, size: Size) => {
      const template = await createTemplate(url, id, size);
      if (!template) return;

      const smctx = getCtx();
      const minShapeComposite = newShapeComposite({
        getStruct: smctx.getShapeStruct,
        shapes: template.shapes,
      });
      const wrapper = minShapeComposite.getWrapperRectForShapes(template.shapes);
      const wrapperCenter = getRectCenter(wrapper);
      const viewCenter = getRectCenter(smctx.getViewRect());
      const affine: AffineMatrix = [1, 0, 0, 1, viewCenter.x - wrapperCenter.x, viewCenter.y - wrapperCenter.y];

      smctx.addShapes(template.shapes.map((s) => ({ ...s, ...minShapeComposite.transformShape(s, affine) })));
      smctx.multiSelectShapes(template.shapes.map((s) => s.id));
    },
    [getCtx, createTemplate],
  );

  return (
    <div className={"transition-opacity" + (stateLabel === "DroppingNewShape" ? " opacity-30" : "")}>
      {ICON_GROUPS.map(({ name, label, url }) => (
        <GroupAccordion
          key={name}
          selectedName={selected}
          name={name}
          label={label}
          url={url}
          type="shapes"
          onClick={handleClickAccordion}
          onIconDragStart={handleIconDragStart}
          onIconClick={handleIconClick}
        />
      ))}
    </div>
  );
};
