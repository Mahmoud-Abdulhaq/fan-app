import { db, kitsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import rows from "./kits.json";
import { matchup } from "./meta";

const TIER_BY_RANK = ["S", "A", "B", "C", "D"] as const;

function tierForRank(rank: number) {
  const tier = TIER_BY_RANK[rank - 1];
  if (!Number.isInteger(rank) || !tier) {
    throw new Error(`Invalid kit rank "${rank}". Expected a rank from 1 to 5.`);
  }
  return tier;
}

// Idempotent content seeding only; schema changes are managed by Publish.
export async function seedKits() {
  const values = rows.map(([name, category, tier, ability, strategy, rank]) => {
    const rankNumber = Number(rank);
    const derivedTier = tierForRank(rankNumber);
    if (String(tier) !== derivedTier) {
      throw new Error(`${String(name)} has tier ${String(tier)} but rank ${rankNumber} maps to ${derivedTier}.`);
    }
    return {
      id: String(name).toLowerCase().replace(/ /g, "-"),
      data: {
        name: String(name), category: String(category), tier: derivedTier,
        ability: String(ability), strategy: String(strategy), rank: rankNumber,
        counters: name === "Baker" ? ["zeno"] : matchup[String(category)]!.ids,
        source: "Kit descriptions are from the user-supplied BedWars Master Specification, Season 17 / October 2026. Category ranks are user-directed; grades are derived from rank (1=S, 2=A, 3=B, 4=C, 5=D). Not independently verified against the live game.",
      },
    };
  });
  await db.insert(kitsTable).values(values).onConflictDoUpdate({
    target: kitsTable.id,
    set: { data: sql`excluded.data` },
  });
}
