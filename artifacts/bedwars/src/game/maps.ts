export type ArenaMapId = "classic" | "crosswind" | "twin-bridges" | "snake-run" | "fortress";

export const ARENA_MAPS: { id: ArenaMapId; name: string; description: string }[] = [
  { id: "classic", name: "Crimson Pass", description: "A straight, fast route through the center." },
  { id: "crosswind", name: "Crosswind", description: "A winding lane changes direction across the map." },
  { id: "twin-bridges", name: "Twin Bridges", description: "Two parallel routes lead to the middle." },
  { id: "snake-run", name: "Snake Run", description: "A longer zigzag route with a wide center." },
  { id: "fortress", name: "Fortress", description: "A broad bridge with extra cover islands." },
];
