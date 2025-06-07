import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const leagues = pgTable("leagues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  url: text("url").notNull(),
  seriesId: text("series_id"),
  samsId: text("sams_id"),
  teamsCount: integer("teams_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  teamId: text("team_id").notNull(),
  samsId: text("sams_id"),
  homepage: text("homepage"),
  logoUrl: text("logo_url"),
  leagueId: integer("league_id").references(() => leagues.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position"),
  jerseyNumber: text("jersey_number"),
  teamId: integer("team_id").references(() => teams.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scrapeLogs = pgTable("scrape_logs", {
  id: serial("id").primaryKey(),
  operation: text("operation").notNull(),
  status: text("status").notNull(), // 'success', 'error', 'warning'
  message: text("message").notNull(),
  details: text("details"),
  duration: integer("duration"), // in milliseconds
  recordsProcessed: integer("records_processed").default(0),
  recordsCreated: integer("records_created").default(0),
  recordsUpdated: integer("records_updated").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const leaguesRelations = relations(leagues, ({ many }) => ({
  teams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  league: one(leagues, {
    fields: [teams.leagueId],
    references: [leagues.id],
  }),
  players: many(players),
}));

export const playersRelations = relations(players, ({ one }) => ({
  team: one(teams, {
    fields: [players.teamId],
    references: [teams.id],
  }),
}));

// Insert schemas
export const insertLeagueSchema = createInsertSchema(leagues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScrapeLogSchema = createInsertSchema(scrapeLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertLeague = z.infer<typeof insertLeagueSchema>;
export type League = typeof leagues.$inferSelect;

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

export type InsertScrapeLog = z.infer<typeof insertScrapeLogSchema>;
export type ScrapeLog = typeof scrapeLogs.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
