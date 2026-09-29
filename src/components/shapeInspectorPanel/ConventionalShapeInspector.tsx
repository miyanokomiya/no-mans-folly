import { useCallback, useMemo } from "react";
import { PointField } from "./PointField";
import { AffineMatrix, IRectangle, IVec2, isSame } from "okageo";
import { Shape, Size } from "../../models";
import { getRectWithRotationFromRectPolygon } from "../../utils/geometry";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { InlineField } from "../atoms/InlineField";
import { useShapeComposite, useStaticShapeComposite } from "../../hooks/storeHooks";
import { resizeShapeTrees } from "../../composables/shapeResizing";
import { BlockGroupField } from "../atoms/BlockGroupField";
import { getAttachmentByUpdatingRotation, getSizePresets, isNoRotationShape } from "../../shapes";
import { SelectInput } from "../atoms/inputs/SelectInput";
import eyeDropperIcon from "../../assets/icons/eyedropper.svg";
import { getMoveToAffine, getRotateToAffine, getScaleToAffine } from "../../composables/inspector";
import { ToggleInput } from "../atoms/inputs/ToggleInput";

interface Props {
  targetShape: Shape;
  targetTmpShape: Shape;
  commit: () => void;
  updateTmpShapes: (patch: { [id: string]: Partial<Shape> }) => void;
  readyState: () => void;
  onBoundsEyeDropperClick?: (type?: "position" | "size" | "rotation") => void;
}

export const ConventionalShapeInspector: React.FC<Props> = ({
  targetShape,
  targetTmpShape,
  commit,
  updateTmpShapes,
  readyState,
  onBoundsEyeDropperClick,
}) => {
  const shapeComposite = useShapeComposite();
  const staticShapeComposite = useStaticShapeComposite();
  const subShapeComposite = useMemo(() => {
    return staticShapeComposite.getSubShapeComposite([targetShape.id]);
  }, [staticShapeComposite, targetShape.id]);

  const srcSize = useMemo<IVec2>(() => {
    const [b] = getRectWithRotationFromRectPolygon(subShapeComposite.getLocalRectPolygon(targetShape));
    return { x: b.width, y: b.height };
  }, [targetShape, subShapeComposite]);

  const targetLocalBounds = useMemo<[IRectangle, rotation: number]>(() => {
    return getRectWithRotationFromRectPolygon(shapeComposite.getLocalRectPolygon(targetTmpShape));
  }, [targetTmpShape, shapeComposite]);

  const targetLocation = useMemo<IVec2>(() => {
    return targetLocalBounds[0];
  }, [targetLocalBounds]);

  const targetSize = useMemo<IVec2>(() => {
    return { x: targetLocalBounds[0].width, y: targetLocalBounds[0].height };
  }, [targetLocalBounds]);

  const handleResize = useCallback(
    (affine: AffineMatrix, draft = false) => {
      readyState();

      const patch = resizeShapeTrees(shapeComposite, [targetShape.id], affine);
      updateTmpShapes(patch);

      if (!draft) {
        commit();
      }
    },
    [commit, readyState, updateTmpShapes, targetShape, shapeComposite],
  );

  const handleChangePosition = useCallback(
    (val: IVec2, draft = false) => {
      const affine = getMoveToAffine(subShapeComposite, targetShape, val);
      handleResize(affine, draft);
    },
    [targetShape, subShapeComposite, handleResize],
  );

  const handleChangeSize = useCallback(
    (val: IVec2, draft = false) => {
      const affine = getScaleToAffine(subShapeComposite, targetShape, val);
      handleResize(affine, draft);
    },
    [handleResize, targetShape, subShapeComposite],
  );

  const handleChangeRotation = useCallback(
    (val: number, draft = false) => {
      const affine = getRotateToAffine(subShapeComposite, targetShape, (val * Math.PI) / 180);
      if (draft) {
        readyState();

        const patch = resizeShapeTrees(shapeComposite, [targetShape.id], affine);
        const attachment = getAttachmentByUpdatingRotation(targetShape, patch[targetShape.id].rotation);
        if (attachment) {
          patch[targetShape.id].attachment = attachment;
        }
        updateTmpShapes(patch);
      } else {
        commit();
      }
    },
    [targetShape, subShapeComposite, commit, readyState, updateTmpShapes, shapeComposite],
  );

  const handleChangeFixedRotation = useCallback(
    (val: boolean) => {
      updateTmpShapes({ [targetShape.id]: { fixedRotation: val ? targetShape.rotation : undefined } });
      commit();
    },
    [targetShape, updateTmpShapes, commit],
  );

  const sizePresetOptions = useMemo<{ value: string; label: string; size: Size }[] | undefined>(() => {
    const presets = getSizePresets(staticShapeComposite.getShapeStruct, targetShape);
    if (!presets) return;

    return [
      { value: "0", size: { width: 0, height: 0 }, label: "Custom" },
      ...presets.map((pre) => {
        const size = pre.value;
        const label = `${pre.label} (${size.width} x ${size.height})`;
        return { value: label, label, size };
      }),
    ];
  }, [staticShapeComposite, targetShape]);

  const sizePreset = useMemo(() => {
    if (!sizePresetOptions) return;

    const option = sizePresetOptions.find(({ size }) => isSame(targetSize, { x: size.width, y: size.height }));
    return option?.value ?? sizePresetOptions[0].value;
  }, [targetSize, sizePresetOptions]);

  const handleSizePresetChange = useCallback(
    (val: string) => {
      const option = sizePresetOptions?.find(({ value }) => value === val);
      if (!option) return;

      const size = { x: option.size.width, y: option.size.height };
      const affine = getScaleToAffine(subShapeComposite, targetShape, size);
      handleResize(affine);
    },
    [handleResize, subShapeComposite, targetShape, sizePresetOptions],
  );

  const sizeField = (
    <InlineField label={"w, h"}>
      <div className="flex items-center">
        <PointField
          value={targetSize}
          onChange={handleChangeSize}
          min={1}
          disabledX={srcSize.x === 0}
          disabledY={srcSize.y === 0}
          swappable
        />
        <EyedropperButton type="size" onBoundsEyeDropperClick={onBoundsEyeDropperClick} />
      </div>
    </InlineField>
  );

  const rotationField = isNoRotationShape(shapeComposite.getShapeStruct, targetShape) ? undefined : (
    <InlineField label={"angle"}>
      <div className="flex items-center">
        <div className="mr-2">
          <ToggleInput value={targetShape.fixedRotation !== undefined} onChange={handleChangeFixedRotation}>
            Fixed
          </ToggleInput>
        </div>
        <div className="w-24">
          <NumberInput
            value={(targetLocalBounds[1] * 180) / Math.PI}
            onChange={handleChangeRotation}
            onBlur={commit}
            disabled={targetShape.fixedRotation !== undefined}
            keepFocus
            slider
          />
        </div>
        <EyedropperButton type="rotation" onBoundsEyeDropperClick={onBoundsEyeDropperClick} />
      </div>
    </InlineField>
  );

  return (
    <BlockGroupField label="Local bounds" accordionKey="shape-bounds">
      <InlineField label={"x, y"}>
        <div className="flex items-center">
          <PointField value={targetLocation} onChange={handleChangePosition} />
          <EyedropperButton type="position" onBoundsEyeDropperClick={onBoundsEyeDropperClick} />
        </div>
      </InlineField>
      {sizePresetOptions && sizePreset ? (
        <BlockGroupField label="Size">
          {sizeField}
          <InlineField label="Preset">
            <div className="w-50">
              <SelectInput value={sizePreset} options={sizePresetOptions} onChange={handleSizePresetChange} />
            </div>
          </InlineField>
        </BlockGroupField>
      ) : (
        sizeField
      )}
      {rotationField}
    </BlockGroupField>
  );
};

interface EyedropperButtonProps {
  type?: "position" | "size" | "rotation";
  onBoundsEyeDropperClick?: (type?: "position" | "size" | "rotation") => void;
}

const EyedropperButton: React.FC<EyedropperButtonProps> = ({ type, onBoundsEyeDropperClick }) => {
  const handleSizeEyeDropperClick = useCallback(() => {
    onBoundsEyeDropperClick?.(type);
  }, [type, onBoundsEyeDropperClick]);
  return (
    <button type="button" className="px-1 self-stretch hover:bg-gray-200" onClick={handleSizeEyeDropperClick}>
      <img src={eyeDropperIcon} className="w-5 h-5" />
    </button>
  );
};
