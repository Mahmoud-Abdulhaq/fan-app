import { pgTable, text, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./bedwars";

export const gameProfilesTable = pgTable("game_profiles", {
  userId: text("user_id").primaryKey().references(() => usersTable.id),
  coins: integer("coins").notNull().default(0),
  games: integer("games").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  unlocked: jsonb("unlocked").$type<string[]>().notNull().default([]),
});
export const gameMatchesTable = pgTable("game_matches", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finished: boolean("finished").notNull().default(false),
});
