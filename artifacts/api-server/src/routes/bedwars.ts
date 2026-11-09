import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { and, eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, kitsTable, usersTable, favoritesTable, ratingsTable, rankingsTable, notesTable, triviaScoresTable } from "@workspace/db";
import * as V from "@workspace/api-zod";
import { matchup, dailyTrivia } from "../lib/meta";

const router: IRouter = Router();
function user(req: Request) { return getAuth(req).userId!; }
async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const id = getAuth(req).userId;
  if (!id) { res.status(401).json({ error: "Sign in to save your personal data." }); return; }
  await db.insert(usersTable).values({ id }).onConflictDoNothing();
  next();
}
async function kits() {
  const [rows, ratings] = await Promise.all([db.select().from(kitsTable), db.select().from(ratingsTable)]);
  return rows.map((row) => {
    const votes = ratings.filter(r => r.kitId === row.id);
    return { id: row.id, ...row.data, averageRating: votes.length ? votes.reduce((s, v) => s + v.rating, 0) / votes.length : 0, ratingCount: votes.length };
  }).sort((a, b) => a.category.localeCompare(b.category) || a.rank - b.rank);
}
async function validKit(id: string, res: Response) {
  const [kit] = await db.select().from(kitsTable).where(eq(kitsTable.id, id));
  if (!kit) { res.status(400).json({ error: "Unknown kit." }); return false; }
  return true;
}
function ranking(row: typeof rankingsTable.$inferSelect) {
  return { id: row.id, name: row.name, items: row.items, updatedAt: row.updatedAt.toISOString() };
}
router.get("/kits", async (_req, res): Promise<void> => { res.json(V.ListKitsResponse.parse(await kits())); });
router.get("/dashboard", async (_req, res): Promise<void> => {
  const all = await kits();
  const rated = all.filter(k => k.ratingCount > 0).sort((a, b) => b.averageRating - a.averageRating || b.ratingCount - a.ratingCount);
  const day = Math.floor(Date.now() / 86400000);
  res.json(V.GetDashboardResponse.parse({
    featuredId: all[day % all.length]?.id ?? "grim-reaper",
    trending: all.filter(k => k.ratingCount > 0).sort((a, b) => b.ratingCount - a.ratingCount || b.averageRating - a.averageRating).slice(0, 5).map(k => k.id),
    topRated: rated.slice(0, 5).map(k => k.id),
    totalRatings: all.reduce((s, k) => s + k.ratingCount, 0),
    snapshot: "Season 17 · October 2026 · Supplied specification, not independently verified. Letter tiers are editorial assignments where the document gives only ordered category ranks.",
  }));
});
router.post("/counters", async (req, res): Promise<void> => {
  const body = V.GetCountersBody.parse(req.body);
  if (new Set(body.enemyIds).size !== body.enemyIds.length) { res.status(400).json({ error: "Select distinct enemy kits." }); return; }
  const all = await kits();
  const enemies = body.enemyIds.map(id => all.find(k => k.id === id));
  if (enemies.some(k => !k)) { res.status(400).json({ error: "Unknown enemy kit." }); return; }
  res.json(V.GetCountersResponse.parse(enemies.map(enemy => {
    const e = enemy!;
    const rule = e.id === "baker" ? { ids: ["zeno"], tip: "Reserve Zeno for Baker. Apply anti-heal before committing, then focus the supported carry to deny extended regeneration trades." } : matchup[e.category]!;
    return { enemyId: e.id, counterIds: rule.ids, tip: rule.tip, highThreat: e.tier === "S" || e.id === "baker" };
  })));
});
router.get("/trivia", (_req, res) => {
  const { answer: _answer, explanation: _explanation, ...question } = dailyTrivia();
  res.json(V.GetTriviaResponse.parse(question));
});
router.post("/trivia", requireUser, async (req, res): Promise<void> => {
  const body = V.AnswerTriviaBody.parse(req.body);
  const q = dailyTrivia();
  if (body.id !== q.id) { res.status(400).json({ error: "This question has expired. Refresh for today's trivia." }); return; }
  const [saved] = await db.insert(triviaScoresTable).values({ userId: user(req), date: q.date, questionId: q.id, answer: body.answer, correct: body.answer === q.answer }).onConflictDoNothing().returning();
  const previous = saved ?? (await db.select().from(triviaScoresTable).where(and(eq(triviaScoresTable.userId, user(req)), eq(triviaScoresTable.date, q.date))))[0]!;
  res.json(V.AnswerTriviaResponse.parse({ correct: previous.correct, correctAnswer: q.answer, explanation: q.explanation }));
});
router.get("/profile", requireUser, async (req, res): Promise<void> => {
  const id = user(req);
  const [favorites, ratings, notes, scores] = await Promise.all([
    db.select().from(favoritesTable).where(eq(favoritesTable.userId, id)),
    db.select().from(ratingsTable).where(eq(ratingsTable.userId, id)),
    db.select().from(notesTable).where(eq(notesTable.userId, id)),
    db.select().from(triviaScoresTable).where(eq(triviaScoresTable.userId, id)).orderBy(desc(triviaScoresTable.date)),
  ]);
  res.json(V.GetProfileResponse.parse({ favorites: favorites.map(f => f.kitId), ratings, notes, triviaScores: scores }));
});
router.put("/favorites/:kitId", requireUser, async (req, res): Promise<void> => {
  const { kitId } = V.SaveFavoriteParams.parse(req.params);
  if (!await validKit(kitId, res)) return;
  await db.insert(favoritesTable).values({ userId: user(req), kitId }).onConflictDoNothing();
  res.json({ success: true });
});
router.delete("/favorites/:kitId", requireUser, async (req, res): Promise<void> => {
  const { kitId } = V.DeleteFavoriteParams.parse(req.params);
  await db.delete(favoritesTable).where(and(eq(favoritesTable.userId, user(req)), eq(favoritesTable.kitId, kitId)));
  res.json({ success: true });
});
router.put("/ratings/:kitId", requireUser, async (req, res): Promise<void> => {
  const { kitId } = V.SaveRatingParams.parse(req.params);
  const { rating } = V.SaveRatingBody.parse(req.body);
  if (!await validKit(kitId, res)) return;
  await db.insert(ratingsTable).values({ userId: user(req), kitId, rating }).onConflictDoUpdate({ target: [ratingsTable.userId, ratingsTable.kitId], set: { rating } });
  res.json({ success: true });
});
router.get("/rankings", requireUser, async (req, res): Promise<void> => {
  res.json(V.ListRankingsResponse.parse((await db.select().from(rankingsTable).where(eq(rankingsTable.userId, user(req))).orderBy(desc(rankingsTable.updatedAt))).map(ranking)));
});
async function validateItems(items: { kitId: string }[], res: Response) {
  if (new Set(items.map(i => i.kitId)).size !== items.length) { res.status(400).json({ error: "Each kit can appear only once in a ranking." }); return false; }
  const all = await db.select({ id: kitsTable.id }).from(kitsTable);
  if (items.some(i => !all.some(k => k.id === i.kitId))) { res.status(400).json({ error: "Unknown kit in ranking." }); return false; }
  return true;
}
router.post("/rankings", requireUser, async (req, res): Promise<void> => {
  const body = V.CreateRankingBody.parse(req.body);
  if (!body.name.trim()) { res.status(400).json({ error: "Enter a ranking name." }); return; }
  if (!await validateItems(body.items, res)) return;
  const [row] = await db.insert(rankingsTable).values({ id: randomUUID(), userId: user(req), ...body, name: body.name.trim() }).returning();
  res.status(201).json(V.CreateRankingResponse.parse(ranking(row!)));
});
router.put("/rankings/:id", requireUser, async (req, res): Promise<void> => {
  const { id } = V.UpdateRankingParams.parse(req.params);
  const body = V.UpdateRankingBody.parse(req.body);
  if (!body.name.trim()) { res.status(400).json({ error: "Enter a ranking name." }); return; }
  if (!await validateItems(body.items, res)) return;
  const [row] = await db.update(rankingsTable).set({ ...body, name: body.name.trim(), updatedAt: new Date() }).where(and(eq(rankingsTable.id, id), eq(rankingsTable.userId, user(req)))).returning();
  if (!row) { res.status(404).json({ error: "Ranking not found." }); return; }
  res.json(V.UpdateRankingResponse.parse(ranking(row)));
});
router.delete("/rankings/:id", requireUser, async (req, res): Promise<void> => {
  const { id } = V.DeleteRankingParams.parse(req.params);
  const rows = await db.delete(rankingsTable).where(and(eq(rankingsTable.id, id), eq(rankingsTable.userId, user(req)))).returning();
  if (!rows.length) { res.status(404).json({ error: "Ranking not found." }); return; }
  res.json({ success: true });
});
router.post("/notes", requireUser, async (req, res): Promise<void> => {
  const body = V.CreateNoteBody.parse(req.body);
  if (!body.text.trim()) { res.status(400).json({ error: "Enter a note." }); return; }
  if (!await validKit(body.kitId, res)) return;
  const [row] = await db.insert(notesTable).values({ id: randomUUID(), userId: user(req), ...body, text: body.text.trim() }).returning();
  res.status(201).json(V.CreateNoteResponse.parse(row));
});
router.put("/notes/:id", requireUser, async (req, res): Promise<void> => {
  const { id } = V.UpdateNoteParams.parse(req.params);
  const body = V.UpdateNoteBody.parse(req.body);
  if (!body.text.trim()) { res.status(400).json({ error: "Enter a note." }); return; }
  if (!await validKit(body.kitId, res)) return;
  const [row] = await db.update(notesTable).set({ ...body, text: body.text.trim() }).where(and(eq(notesTable.id, id), eq(notesTable.userId, user(req)))).returning();
  if (!row) { res.status(404).json({ error: "Note not found." }); return; }
  res.json(V.UpdateNoteResponse.parse(row));
});
router.delete("/notes/:id", requireUser, async (req, res): Promise<void> => {
  const { id } = V.DeleteNoteParams.parse(req.params);
  const rows = await db.delete(notesTable).where(and(eq(notesTable.id, id), eq(notesTable.userId, user(req)))).returning();
  if (!rows.length) { res.status(404).json({ error: "Note not found." }); return; }
  res.json({ success: true });
});
export default router;
