import { db, kitsTable } from "@workspace/db";
import rows from "./kits.json";
import { matchup } from "./meta";

// Idempotent content seeding only; schema changes are managed by Publish.
export async function seedKits() {
  await db.insert(kitsTable).values(rows.map(([name, category, tier, ability, strategy, rank]) => ({
    id: String(name).toLowerCase().replace(/ /g, "-"),
    data: {
      name: String(name), category: String(category), tier: String(tier),
      ability: String(ability), strategy: String(strategy), rank: Number(rank),
      counters: name === "Baker" ? ["zeno"] : matchup[String(category)]!.ids,
      source: "User-supplied BedWars Master Specification, Season 17 / October 2026. Not independently verified. Letter tiers editorial where category ranks alone were specified.",
    },
  }))).onConflictDoNothing();
}
