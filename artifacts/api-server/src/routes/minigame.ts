import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
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
const DEMO_ADMIN_PIN = "123";
const ADMIN_SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_FAILED_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 10 * 60 * 1000;
const MAX_COINS = 2_147_483_647;
const adminSessions = new Map<string, { userId: string; expiresAt: number }>();
const failedPinAttempts = new Map<string, { count: number; expiresAt: number }>();

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

router.post("/minigame/admin/unlock", async (req, res): Promise<void> => {
  const parsed = V.UnlockDemoAdminBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Enter the demo PIN." }); return; }

  const id = userId(req);
  const now = Date.now();
  const attempts = failedPinAttempts.get(id);
  if (attempts && attempts.expiresAt <= now) failedPinAttempts.delete(id);
  const activeAttempts = failedPinAttempts.get(id);
  if (activeAttempts && activeAttempts.count >= MAX_FAILED_PIN_ATTEMPTS) {
    res.status(429).json({ error: "Too many attempts. Try again in 10 minutes." });
    return;
  }

  if (parsed.data.pin !== DEMO_ADMIN_PIN) {
    const nextCount = (activeAttempts?.count ?? 0) + 1;
    failedPinAttempts.set(id, { count: nextCount, expiresAt: now + PIN_LOCKOUT_MS });
    res.status(401).json({ error: "That PIN is not correct." });
    return;
  }

  failedPinAttempts.delete(id);
  for (const [token, session] of adminSessions) {
    if (session.expiresAt <= now) adminSessions.delete(token);
  }
  const token = randomBytes(32).toString("base64url");
  adminSessions.set(token, { userId: id, expiresAt: now + ADMIN_SESSION_TTL_MS });
  res.json(V.UnlockDemoAdminResponse.parse({ token, expiresInSeconds: ADMIN_SESSION_TTL_MS / 1000 }));
});

router.post("/minigame/admin/action", async (req, res): Promise<void> => {
  const parsed = V.PerformDemoAdminActionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Choose a valid admin action." }); return; }

  const id = userId(req);
  const session = adminSessions.get(parsed.data.token);
  if (!session || session.userId !== id || session.expiresAt <= Date.now()) {
    if (session?.expiresAt && session.expiresAt <= Date.now()) adminSessions.delete(parsed.data.token);
    res.status(401).json({ error: "Admin access expired. Enter the PIN again." });
    return;
  }

  const { action, amount } = parsed.data;
  if ((action === "grantCoins" || action === "setCoins") && amount === undefined) {
    res.status(400).json({ error: "Enter a coin amount." });
    return;
  }
  if (action === "grantCoins" && amount === 0) {
    res.status(400).json({ error: "Grant at least 1 coin." });
    return;
  }

  const allKitIds = action === "unlockAllKits"
    ? (await db.select({ id: kitsTable.id }).from(kitsTable)).map((kit) => kit.id)
    : [];
  const error = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(gameProfilesTable).where(eq(gameProfilesTable.userId, id)).for("update");
    if (!row) return "Game profile not found.";

    if (action === "grantCoins") {
      if (row.coins + amount! > MAX_COINS) return "That would exceed the maximum coin balance.";
      await tx.update(gameProfilesTable).set({ coins: row.coins + amount! }).where(eq(gameProfilesTable.userId, id));
    } else if (action === "setCoins") {
      await tx.update(gameProfilesTable).set({ coins: amount! }).where(eq(gameProfilesTable.userId, id));
    } else if (action === "resetStats") {
      await tx.update(gameProfilesTable).set({ games: 0, wins: 0, rankedRp: 0 }).where(eq(gameProfilesTable.userId, id));
    } else {
      await tx.update(gameProfilesTable).set({ unlocked: [...new Set([...row.unlocked, ...allKitIds])] }).where(eq(gameProfilesTable.userId, id));
    }
    return null;
  });

  if (error) { res.status(400).json({ error }); return; }
  res.json(await profile(id));
});

router.post("/minigame/admin/lock", async (req, res): Promise<void> => {
  const parsed = V.LockDemoAdminBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid admin session." }); return; }
  const session = adminSessions.get(parsed.data.token);
  if (session?.userId === userId(req)) adminSessions.delete(parsed.data.token);
  res.json(V.LockDemoAdminResponse.parse({ locked: true }));
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
  if (!parsed.success) { res.status(400).json({ error: "Choose a match mode." }); return; }
  if (parsed.data.mode === "pit" && !parsed.data.kitId) { res.status(400).json({ error: "Choose a kit for The Pit." }); return; }
  if (parsed.data.mode === "ranked" && parsed.data.kitId) { res.status(400).json({ error: "Ranked matches do not allow kits." }); return; }
  const id = userId(req);
  const ticket = await db.transaction(async tx => {
    const [row] = await tx.select().from(gameProfilesTable).where(eq(gameProfilesTable.userId, id)).for("update");
    const [kit] = parsed.data.kitId ? await tx.select().from(kitsTable).where(eq(kitsTable.id, parsed.data.kitId)) : [];
    if (parsed.data.mode === "pit" && (!kit || (kit.data.tier !== "D" && !row!.unlocked.includes(kit.id)))) return null;
    // One active match per account; opening another tab abandons the previous ticket.
    await tx.delete(gameMatchesTable).where(and(eq(gameMatchesTable.userId, id), eq(gameMatchesTable.finished, false)));
    const matchId = randomUUID();
    await tx.insert(gameMatchesTable).values({ id: matchId, userId: id, mode: parsed.data.mode });
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
    const elapsedMs = Date.now() - match.startedAt.getTime();
    if (match.mode === "pit" && elapsedMs < 20_000) return "Play for at least 20 seconds to earn a match reward.";
    const coinReward = elapsedMs < 20_000 ? 0 : parsed.data.won ? 15 : 5;
    const [row] = await tx.select().from(gameProfilesTable).where(eq(gameProfilesTable.userId, id));
    await tx.update(gameMatchesTable).set({ finished: true }).where(eq(gameMatchesTable.id, match.id));
    await tx.update(gameProfilesTable).set({
      coins: row!.coins + coinReward,
      games: row!.games + 1,
      wins: row!.wins + (parsed.data.won ? 1 : 0),
      rankedRp: match.mode === "ranked" ? row!.rankedRp + (parsed.data.won ? 25 : -10) : row!.rankedRp,
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
