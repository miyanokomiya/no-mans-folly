import { AffineMatrix, sub } from "okageo";
import { EntityPatchInfo, Shape } from "../../models";
import { FrameShape, isFrameShape } from "../../shapes/frame";
import { isFrameAlignGroupShape } from "../../shapes/frameGroups/frameAlignGroup";
import { patchPipe } from "../../utils/commons";
import { getAlignLayoutPatchFunctions } from "../alignHandler";
import { getNextShapeComposite, ShapeComposite } from "../shapeComposite";
import { getRootShapeIdsByFrame } from "../frame";

export function getFrameAlignLayoutPatch(
  shapeComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
): { [id: string]: Partial<Shape> } {
  const dummyShapeComposite = getDummyShapeCompositeForFrameAlign(shapeComposite);
  const patchFns = getAlignLayoutPatchFunctions(
    dummyShapeComposite,
    getNextShapeComposite(dummyShapeComposite, patchInfo),
    patchInfo,
  );

  const layoutResult = patchPipe(patchFns, {});
  const resultEntries = Object.entries(layoutResult.patch);
  if (resultEntries.length === 0) return {};

  // Remove temporary effect to get shapes in a frame based on their original places.
  // FIXME: Here isn't the best place to get this static shape composite.
  const staticShapeComposite = getNextShapeComposite(shapeComposite, {});
  const layoutPatch: { [id: string]: Partial<Shape> } = {};
  resultEntries.forEach(([id, val]) => {
    const shape = staticShapeComposite.shapeMap[id];

    if (isFrameShape(shape)) {
      const nextFrame = layoutResult.result[id] as FrameShape;
      layoutPatch[id] = val;

      const v = sub(nextFrame.p, shape.p);
      const affine: AffineMatrix = [1, 0, 0, 1, v.x, v.y];
      const chidlren = getRootShapeIdsByFrame(staticShapeComposite, shape);
      staticShapeComposite.getAllTransformTargets(chidlren).forEach((c) => {
        layoutPatch[c.id] = staticShapeComposite.transformShape(c, affine);
      });
    } else {
      layoutPatch[id] = val;
    }
  });

  return layoutPatch;
}

export function getDummyShapeCompositeForFrameAlign(shapeComposite: ShapeComposite): ShapeComposite {
  const typePatch: { [id: string]: Partial<Shape> } = {};
  shapeComposite.shapes.map((s) => {
    if (isFrameShape(s)) {
      typePatch[s.id] = { type: "rectangle" };
    }
    if (isFrameAlignGroupShape(s)) {
      typePatch[s.id] = { type: "align_box" };
    }
  });
  return getNextShapeComposite(shapeComposite, { update: typePatch });
}
