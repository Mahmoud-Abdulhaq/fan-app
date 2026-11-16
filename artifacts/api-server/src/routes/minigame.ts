import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { randomInt, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, gameProfilesTable, gameMatchesTable, kitsTable, usersTable } from "@workspace/db";
import * as V from "@workspace/api-zod";

const router: IRouter = Router();
const prices: Record<string, number> = { D: 0, C: 20, B: 30, A: 40, S: 50 };
const skinCrates = {
  swords: ["sword-wood-birch", "sword-wood-charcoal", "sword-stone-ember", "sword-stone-frost", "sword-iron-ruby", "sword-iron-shadow"],
  axes: ["axe-rust", "axe-onyx"],
  blocks: ["block-obsidian", "block-ash", "block-cobalt", "block-moss", "block-sandstone"],
} as const;
const staticSkinSlots: Record<string, "sword" | "axe" | "block"> = {
  "sword-wood-birch": "sword", "sword-wood-charcoal": "sword", "sword-stone-ember": "sword", "sword-stone-frost": "sword", "sword-iron-ruby": "sword", "sword-iron-shadow": "sword",
  "axe-rust": "axe", "axe-onyx": "axe",
  "block-obsidian": "block", "block-ash": "block", "block-cobalt": "block", "block-moss": "block", "block-sandstone": "block",
};
const emptyEquipped = { sword: null, axe: null, block: null, kit: null };
const userId = (req: Request) => getAuth(req).userId!;

function kitSkinId(id: string) { return `kit-${id}`; }

async function skinSlotsForKits() {
  const kits = await db.select().from(kitsTable);
  return Object.fromEntries(kits.map((kit) => [kitSkinId(kit.id), "kit" as const]));
}

async function crateSkins(crate: "swords" | "kits" | "blocks" | "axes") {
  if (crate === "kits") return Object.keys(await skinSlotsForKits());
  return [...skinCrates[crate]];
}

router.use("/minigame", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const id = getAuth(req).userId;
  if (!id) { res.status(401).json({ error: "Sign in to play the minigame." }); return; }
  await db.insert(usersTable).values({ id }).onConflictDoNothing();
  await db.insert(gameProfilesTable).values({ userId: id }).onConflictDoNothing();
  next();
});

async function profile(id: string) {
  const [row] = await db.select().from(gameProfilesTable).where(eq(gameProfilesTable.userId, id));
  const kits = await db.select().from(kitsTable);
  return V.GetGameProfileResponse.parse({
    ...row,
    unlocked: [...new Set([...row!.unlocked, ...kits.filter(k => k.data.tier === "D").map(k => k.id)])],
    ownedSkins: row!.ownedSkins ?? [],
    equippedSkins: row!.equippedSkins ?? emptyEquipped,
  });
}

router.get("/minigame/profile", async (req, res): Promise<void> => {
  res.json(await profile(userId(req)));
});

router.post("/minigame/unlock", async (req, res): Promise<void> => {
  const parsed = V.UnlockGameKitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Choose a kit." }); return; }
  const [kit] = await db.select().from(kitsTable).where(eq(kitsTable.id, parsed.data.kitId));
  if (!kit || prices[kit.data.tier] === undefined) { res.status(400).json({ error: "Unknown kit." }); return; }
  const id = userId(req);
  const error = await db.transaction(async tx => {
    const [row] = await tx.select().from(gameProfilesTable).where(eq(gameProfilesTable.userId, id)).for("update");
    if (kit.data.tier === "D" || row!.unlocked.includes(kit.id)) return null;
    const price = prices[kit.data.tier]!;
    if (row!.coins < price) return "Not enough coins.";
    await tx.update(gameProfilesTable).set({ coins: row!.coins - price, unlocked: [...row!.unlocked, kit.id] }).where(eq(gameProfilesTable.userId, id));
    return null;
  });
  if (error) { res.status(400).json({ error }); return; }
  res.json(await profile(id));
});

router.post("/minigame/match", async (req, res): Promise<void> => {
  const parsed = V.StartGameMatchBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Choose a kit." }); return; }
  const id = userId(req);
  const ticket = await db.transaction(async tx => {
    const [row] = await tx.select().from(gameProfilesTable).where(eq(gameProfilesTable.userId, id)).for("update");
    const [kit] = await tx.select().from(kitsTable).where(eq(kitsTable.id, parsed.data.kitId));
    if (!kit || (kit.data.tier !== "D" && !row!.unlocked.includes(kit.id))) return null;
    // One active match per account; opening another tab abandons the previous ticket.
    await tx.delete(gameMatchesTable).where(and(eq(gameMatchesTable.userId, id), eq(gameMatchesTable.finished, false)));
    const matchId = randomUUID();
    await tx.insert(gameMatchesTable).values({ id: matchId, userId: id });
    return { matchId };
  });
  if (!ticket) { res.status(403).json({ error: "Unlock this kit before playing." }); return; }
  res.json(V.StartGameMatchResponse.parse(ticket));
});

router.post("/minigame/finish", async (req, res): Promise<void> => {
  const parsed = V.FinishGameMatchBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid match result." }); return; }
  const id = userId(req);
  const error = await db.transaction(async tx => {
    await tx.select().from(gameProfilesTable).where(eq(gameProfilesTable.userId, id)).for("update");
    const [match] = await tx.select().from(gameMatchesTable).where(and(eq(gameMatchesTable.id, parsed.data.matchId), eq(gameMatchesTable.userId, id))).for("update");
    if (!match) return "This match is no longer active. Another tab may have started a new match.";
    if (match.finished) return null; // Retries cannot grant a second reward.
    if (Date.now() - match.startedAt.getTime() < 20_000) return "Play for at least 20 seconds to earn a match reward.";
    const [row] = await tx.select().from(gameProfilesTable).where(eq(gameProfilesTable.userId, id));
    await tx.update(gameMatchesTable).set({ finished: true }).where(eq(gameMatchesTable.id, match.id));
    await tx.update(gameProfilesTable).set({
      coins: row!.coins + (parsed.data.won ? 15 : 5),
      games: row!.games + 1,
      wins: row!.wins + (parsed.data.won ? 1 : 0),
    }).where(eq(gameProfilesTable.userId, id));
    return null;
  });
  if (error) { res.status(400).json({ error }); return; }
  res.json(await profile(id));
});

router.post("/minigame/crates/open", async (req, res): Promise<void> => {
  const parsed = V.OpenSkinCrateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Choose a skin crate." }); return; }
  const id = userId(req);
  const slots = { ...staticSkinSlots, ...await skinSlotsForKits() };
  const pool = await crateSkins(parsed.data.crate);
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(gameProfilesTable).where(eq(gameProfilesTable.userId, id)).for("update");
    const available = pool.filter((skinId) => !row!.ownedSkins.includes(skinId));
    if (!available.length) return { error: "You already own every skin in this crate." };
    if (row!.coins < 10) return { error: "You need 10 coins to open this crate." };
    const skinId = available[randomInt(available.length)]!;
    await tx.update(gameProfilesTable).set({
      coins: row!.coins - 10,
      ownedSkins: [...row!.ownedSkins, skinId],
    }).where(eq(gameProfilesTable.userId, id));
    return { skinId };
  });
  if ("error" in result) { res.status(400).json({ error: result.error }); return; }
  res.json(V.OpenSkinCrateResponse.parse({ skinId: result.skinId, profile: await profile(id) }));
});

router.post("/minigame/cosmetics/equip", async (req, res): Promise<void> => {
  const parsed = V.EquipGameSkinBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Choose a valid skin slot." }); return; }
  const id = userId(req);
  const slots = { ...staticSkinSlots, ...await skinSlotsForKits() };
  const { slot, skinId } = parsed.data;
  if (skinId !== null && slots[skinId] !== slot) { res.status(400).json({ error: "That skin does not fit this slot." }); return; }
  const error = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(gameProfilesTable).where(eq(gameProfilesTable.userId, id)).for("update");
    if (skinId !== null && !row!.ownedSkins.includes(skinId)) return "You do not own that skin.";
    await tx.update(gameProfilesTable).set({
      equippedSkins: { ...(row!.equippedSkins ?? emptyEquipped), [slot]: skinId },
    }).where(eq(gameProfilesTable.userId, id));
    return null;
  });
  if (error) { res.status(400).json({ error }); return; }
  res.json(await profile(id));
});

export default router;
