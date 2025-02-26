import { PointField } from "./PointField";
import { BlockGroupField } from "../atoms/BlockGroupField";
import { InlineField } from "../atoms/InlineField";
import { AffineMatrix, IRectangle, IVec2, multiAffines } from "okageo";
import { useCallback } from "react";

interface Props {
  bounds: IRectangle;
  draftBounds: IRectangle;
  onBoundsChange?: (affine: AffineMatrix, draft?: boolean) => void;
}

export const BoundsField: React.FC<Props> = ({ bounds, draftBounds, onBoundsChange }) => {
  const handleChangePosition = useCallback(
    (val: IVec2, draft = false) => {
      const affine = getMoveToAffine(bounds, val);
      onBoundsChange?.(affine, draft);
    },
    [bounds, onBoundsChange],
  );

  const handleChangeSize = useCallback(
    (val: IVec2, draft = false) => {
      const affine = getScaleToAffine(bounds, val);
      onBoundsChange?.(affine, draft);
    },
    [bounds, onBoundsChange],
  );

  return (
    <BlockGroupField label="Bounds" accordionKey="shape-bounds">
      <InlineField label={"x, y"}>
        <PointField value={draftBounds} onChange={handleChangePosition} />
      </InlineField>
      <InlineField label={"w, h"}>
        <PointField
          value={{ x: draftBounds.width, y: draftBounds.height }}
          onChange={handleChangeSize}
          min={1}
          disabledX={bounds.width === 0}
          disabledY={bounds.height === 0}
        />
      </InlineField>
    </BlockGroupField>
  );
};

function getMoveToAffine(rect: IRectangle, to: IVec2): AffineMatrix {
  return [1, 0, 0, 1, to.x - rect.x, to.y - rect.y];
}

function getScaleToAffine(rect: IRectangle, to: IVec2): AffineMatrix {
  const origin = rect;

  return multiAffines([
    [1, 0, 0, 1, origin.x, origin.y],
    [rect.width === 0 ? 1 : to.x / rect.width, 0, 0, rect.height === 0 ? 1 : to.y / rect.height, 0, 0],
    [1, 0, 0, 1, -origin.x, -origin.y],
  ]);
}
