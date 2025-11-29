import { describe, test, expect } from "vitest";
import { generateSymbolAssetId, getSymbolAssetMigrationInfo } from "./symbol";
import { createShape, getCommonStruct } from "..";
import { SymbolShape } from "../symbol";

describe("generateSymbolAssetId", () => {
  test("should return hash for given IDs", async () => {
    const res0 = await generateSymbolAssetId(["abc", "xyz"]);
    const res1 = await generateSymbolAssetId(["abc", "xyz"]);
    const res2 = await generateSymbolAssetId(["bbc", "xyz"]);
    expect(res0).toBe(res1);
    expect(res1).not.toBe(res2);
  });
});

describe("getSymbolAssetMigrationInfo", () => {
  test("should return migration info to update symbol asset IDs", async () => {
    const symbol0 = createShape<SymbolShape>(getCommonStruct, "symbol", {
      id: "symbol0",
      assetId: "aaa",
      src: ["a", "b"],
    });
    const newAssetId = await generateSymbolAssetId(symbol0.src);
    const res0 = await getSymbolAssetMigrationInfo([symbol0]);
    expect(res0).toEqual({
      patch: { [symbol0.id]: { assetId: newAssetId } },
      assetIdMigrationMap: new Map([[symbol0.assetId, newAssetId]]),
    });
  });
});
