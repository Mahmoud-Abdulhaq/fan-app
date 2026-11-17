export const RANK_TIERS = [
  { name: "Unranked", minRp: 0 },
  { name: "Bronze", minRp: 100 },
  { name: "Silver", minRp: 200 },
  { name: "Gold", minRp: 300 },
  { name: "Diamond", minRp: 400 },
  { name: "Emerald", minRp: 500 },
  { name: "Nightmare", minRp: 600 },
] as const;

export type RankedTier = (typeof RANK_TIERS)[number]["name"];

export function rankForRp(rp: number) {
  const points = Math.floor(rp);
  const tierPoints = Math.max(0, points);
  const tier = [...RANK_TIERS].reverse().find((item) => tierPoints >= item.minRp)!;
  const next = RANK_TIERS.find((item) => item.minRp > tier.minRp);
  return {
    name: tier.name,
    minRp: tier.minRp,
    nextName: next?.name ?? null,
    nextRp: next?.minRp ?? null,
    progress: next ? Math.max(0, points - tier.minRp) : 100,
    progressToNext: next ? next.minRp - tier.minRp : 100,
  };
}
