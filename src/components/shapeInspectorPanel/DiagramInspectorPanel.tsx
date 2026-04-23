import { useCallback, useContext, useState } from "react";
import { ColorPickerPanel } from "../molecules/ColorPickerPanel";
import { isIndexedColor, rednerRGBA } from "../../utils/color";
import { Color, RGBA } from "../../models";
import { useColorPalette } from "../../hooks/storeHooks";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { BlockField } from "../atoms/BlockField";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";

export const DiagramInspectorPanel: React.FC = () => {
  const { diagramStore } = useContext(AppCanvasContext);
  const palette = useColorPalette();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [draftColor, setDraftColor] = useState<RGBA>(palette[selectedIndex]);

  const handleClickIndex = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      setDraftColor(palette[index]);
    },
    [palette],
  );

  const patchColor = useCallback(
    (color: RGBA, draft = false) => {
      setDraftColor(color);
      if (!draft) {
        const nextPalette = palette.slice();
        nextPalette[selectedIndex] = color;
        diagramStore.patchEntity({ colorPalette: nextPalette });
      }
    },
    [diagramStore, selectedIndex, palette],
  );

  const handleColorClick = useCallback(
    (color: Color, draft = false) => {
      if (!isIndexedColor(color)) {
        patchColor(color, draft);
      }
    },
    [patchColor],
  );

  const onAlphaChanged = useCallback(
    (val: number, draft = false) => {
      patchColor({ ...draftColor, a: val }, draft);
    },
    [patchColor, draftColor],
  );

  return (
    <div>
      <BlockField label="Indexed color">
        <div className="w-max grid grid-cols-10 grid-flow-row">
          {palette.map((color, i) => {
            const selected = i === selectedIndex;
            return (
              <ColorIndexItem
                key={i}
                index={i}
                color={selected ? draftColor : color}
                selected={selected}
                onClick={handleClickIndex}
              />
            );
          })}
        </div>
        <div className="my-2">
          <SliderInput min={0} max={1} value={draftColor.a} onChanged={onAlphaChanged} />
        </div>
        <ColorPickerPanel color={draftColor} onChange={handleColorClick} />
      </BlockField>
    </div>
  );
};

interface ColorIndexItemProps {
  index: number;
  color: RGBA;
  selected?: boolean;
  onClick?: (index: number) => void;
}

export const ColorIndexItem: React.FC<ColorIndexItemProps> = ({ index, color, selected, onClick }) => {
  const handleClick = useCallback(() => onClick?.(index), [index, onClick]);
  return (
    <button
      key={index}
      type="button"
      className={"w-6 h-6 border-2" + (selected ? " border-cyan-400" : "")}
      style={{ backgroundColor: rednerRGBA(color) }}
      onClick={handleClick}
    />
  );
};
