import { useCallback, useContext } from "react";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { AppStateContext } from "../../contexts/AppContext";
import { InlineField } from "../atoms/InlineField";
import { isVNNodeShape, VnNodeShape } from "../../shapes/vectorNetworks/vnNode";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import iconVnNode from "../../assets/icons/vnnode.svg";
import { Shape } from "../../models";

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string, option?: { keepFocus?: boolean }) => void;
  defaultDirection?: PopupDirection;
  indexShape: Shape;
  focusBack?: () => void;
}

export const FloatMenuVnNodeItems: React.FC<Props> = ({
  popupedKey,
  setPopupedKey,
  defaultDirection,
  indexShape,
  focusBack,
}) => {
  const { getShapeComposite, setTmpShapeMap, patchShapes, getSelectedShapeIdMap } = useContext(AppStateContext);

  const handleRadiusChange = useCallback(
    (radius: number, draft = false) => {
      const ids = Object.keys(getSelectedShapeIdMap());
      const sm = getShapeComposite();
      const shapeMap = sm.shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<VnNodeShape> }>((p, id) => {
        if (shapeMap[id] && isVNNodeShape(shapeMap[id])) {
          p[id] = { r: radius } as Partial<VnNodeShape>;
        }
        return p;
      }, {});

      if (draft) {
        setTmpShapeMap(patch);
      } else {
        setTmpShapeMap({});
        patchShapes(patch);
        focusBack?.();
      }
    },
    [focusBack, getSelectedShapeIdMap, getShapeComposite, patchShapes, setTmpShapeMap],
  );

  if (!isVNNodeShape(indexShape)) return;

  const popup = (
    <div className="w-50 p-1">
      <InlineField label="Node radius">
        <div className="w-20">
          <NumberInput value={indexShape.r} onChange={handleRadiusChange} min={1} slider keepFocus />
        </div>
      </InlineField>
    </div>
  );

  return (
    <div className="flex flex-col gap-1">
      <PopupButton
        name="vn_node"
        opened={popupedKey === "vn_node"}
        popup={popup}
        onClick={setPopupedKey}
        defaultDirection={defaultDirection}
      >
        <img src={iconVnNode} alt="VN node" />
      </PopupButton>
    </div>
  );
};
