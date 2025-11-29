import { generateSecureHash } from "../../utils/hash";

export async function generateSymbolAssetId(ids: string[]): Promise<string> {
  const hash = await generateSecureHash(ids.join(","));
  return `symbol_${hash}.svg`;
}
