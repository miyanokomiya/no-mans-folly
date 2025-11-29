import { generateSecureHash } from "../../utils/hash";

export async function generateSymbolAssetId(ids: string[]): Promise<string> {
  const hash = await generateSecureHash(ids.join(","));
  return `${hash}.svg`;
}
