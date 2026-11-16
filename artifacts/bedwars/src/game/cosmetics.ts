import type { Kit } from "@workspace/api-client-react";

export type CosmeticCrate = "swords" | "kits" | "blocks" | "axes";
export type CosmeticSlot = "sword" | "kit" | "block" | "axe";

export interface CosmeticSkin {
  id: string;
  name: string;
  slot: CosmeticSlot;
  crate: CosmeticCrate;
  color: string;
  accent: string;
  swordTier?: 0 | 1 | 2;
}

export const STATIC_SKINS: CosmeticSkin[] = [
  { id: "sword-wood-birch", name: "Birchwood Sword", slot: "sword", crate: "swords", color: "#9c754e", accent: "#d8b584", swordTier: 0 },
  { id: "sword-wood-charcoal", name: "Charcoal Wood Sword", slot: "sword", crate: "swords", color: "#3a3535", accent: "#946767", swordTier: 0 },
  { id: "sword-stone-ember", name: "Ember Stone Sword", slot: "sword", crate: "swords", color: "#b94b2a", accent: "#f4a24c", swordTier: 1 },
  { id: "sword-stone-frost", name: "Frost Stone Sword", slot: "sword", crate: "swords", color: "#557b9b", accent: "#aac6db", swordTier: 1 },
  { id: "sword-iron-ruby", name: "Ruby Iron Sword", slot: "sword", crate: "swords", color: "#a51f32", accent: "#ed6274", swordTier: 2 },
  { id: "sword-iron-shadow", name: "Shadow Iron Sword", slot: "sword", crate: "swords", color: "#292d35", accent: "#8b96a7", swordTier: 2 },
  { id: "axe-rust", name: "Rustwood Axe", slot: "axe", crate: "axes", color: "#8c452e", accent: "#c08b51" },
  { id: "axe-onyx", name: "Onyx Axe", slot: "axe", crate: "axes", color: "#25232b", accent: "#a84646" },
  { id: "block-obsidian", name: "Obsidian Wool", slot: "block", crate: "blocks", color: "#282436", accent: "#8164a6" },
  { id: "block-ash", name: "Ash Wool", slot: "block", crate: "blocks", color: "#5b5d64", accent: "#aeb1b8" },
  { id: "block-cobalt", name: "Cobalt Wool", slot: "block", crate: "blocks", color: "#24519a", accent: "#68a6ec" },
  { id: "block-moss", name: "Moss Wool", slot: "block", crate: "blocks", color: "#36563c", accent: "#81a35d" },
  { id: "block-sandstone", name: "Red Sandstone Wool", slot: "block", crate: "blocks", color: "#874d3c", accent: "#ca8b5b" },
];

export const CRATES: { id: CosmeticCrate; name: string; slot: CosmeticSlot; description: string }[] = [
  { id: "swords", name: "Sword crate", slot: "sword", description: "Two looks for each of the wood, stone, and iron swords." },
  { id: "kits", name: "Kit skin crate", slot: "kit", description: "One character skin for every kit." },
  { id: "blocks", name: "Block crate", slot: "block", description: "Five looks for your placed blocks." },
  { id: "axes", name: "Axe crate", slot: "axe", description: "Two looks for your axe." },
];

export function kitSkinId(kitId: string) { return `kit-${kitId}`; }

export function getCosmeticSkin(id: string, kits: Kit[]): CosmeticSkin | undefined {
  const fixed = STATIC_SKINS.find((skin) => skin.id === id);
  if (fixed) return fixed;
  const kit = kits.find((item) => kitSkinId(item.id) === id);
  return kit ? {
    id, name: `${kit.name} Shadow Outfit`, slot: "kit", crate: "kits",
    color: "#6d272c", accent: "#d37b5e",
  } : undefined;
}

export function getCratePool(crate: CosmeticCrate, kits: Kit[]) {
  if (crate === "kits") return kits.map((kit) => getCosmeticSkin(kitSkinId(kit.id), kits)!).filter(Boolean);
  return STATIC_SKINS.filter((skin) => skin.crate === crate);
}

export function blockSkinIndex(id: string | null) {
  return id ? STATIC_SKINS.filter((skin) => skin.slot === "block").findIndex((skin) => skin.id === id) + 1 : 0;
}

export function blockSkinForIndex(index: number) {
  return STATIC_SKINS.filter((skin) => skin.slot === "block")[index - 1];
}
