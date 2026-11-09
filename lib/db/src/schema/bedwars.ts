import { pgTable, text, integer, jsonb, boolean, primaryKey, timestamp } from "drizzle-orm/pg-core";

export const kitsTable = pgTable("kits", {
  id: text("id").primaryKey(),
  data: jsonb("data").$type<{ name: string; category: string; tier: string; ability: string; strategy: string; counters: string[]; rank: number; source: string }>().notNull(),
});
export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const favoritesTable = pgTable("favorites", {
  userId: text("user_id").notNull().references(() => usersTable.id),
  kitId: text("kit_id").notNull().references(() => kitsTable.id),
}, (t) => [primaryKey({ columns: [t.userId, t.kitId] })]);
export const ratingsTable = pgTable("ratings", {
  userId: text("user_id").notNull().references(() => usersTable.id),
  kitId: text("kit_id").notNull().references(() => kitsTable.id),
  rating: integer("rating").notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.kitId] })]);
export const rankingsTable = pgTable("rankings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  items: jsonb("items").$type<{ kitId: string; tier: string }[]>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const notesTable = pgTable("notes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  kitId: text("kit_id").notNull().references(() => kitsTable.id),
  text: text("text").notNull(),
});
export const triviaScoresTable = pgTable("trivia_scores", {
  userId: text("user_id").notNull().references(() => usersTable.id),
  date: text("date").notNull(),
  questionId: text("question_id").notNull(),
  answer: integer("answer").notNull(),
  correct: boolean("correct").notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.date] })]);
