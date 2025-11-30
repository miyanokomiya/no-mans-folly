import { Shape } from "../../models";
import { generateSecureHash } from "../../utils/hash";
import { isSymbolShape, SymbolShape } from "../symbol";

export async function generateSymbolAssetId(ids: string[]): Promise<string> {
  const hash = await generateSecureHash(getAssetIdSrcStr(ids));
  return `symbol_${hash}.svg`;
}

export function getAssetIdSrcStr(ids: string[]): string {
  return ids.join(",");
}

/**
 * Returns migration info to update "assetId" of symbol shapes based on their "src".
 */
export async function getSymbolAssetMigrationInfo(shapes: Shape[]): Promise<{
  patch: { [id: string]: Partial<Shape> };
  assetIdMigrationMap: Map<string, string>;
}> {
  const assetIdMigrationMap = new Map<string, string>();
  const shapesByAssetId = new Map<string, SymbolShape[]>();
  shapes
    .filter((s) => isSymbolShape(s))
    .forEach((s) => {
      if (!s.assetId) return;

      if (!shapesByAssetId.has(s.assetId)) {
        shapesByAssetId.set(s.assetId, []);
      }
      shapesByAssetId.get(s.assetId)?.push(s);
    });

  for (const [assetId, list] of shapesByAssetId) {
    const newAssetId = await generateSymbolAssetId(list[0].src);
    assetIdMigrationMap.set(assetId, newAssetId);
  }

  const patch: { [id: string]: Partial<SymbolShape> } = {};
  for (const [assetId, list] of shapesByAssetId) {
    const newAssetId = assetIdMigrationMap.get(assetId);
    list.forEach((s) => {
      patch[s.id] = { assetId: newAssetId };
    });
  }

  return { patch, assetIdMigrationMap };
}
