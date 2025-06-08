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
  nationality: text("nationality"),
  jerseyNumber: text("jersey_number"),
  playerId: text("player_id"), // Store teamMemberId from volleyball website
  teamId: integer("team_id").references(() => teams.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  matchId: text("match_id"),
  homeTeamId: integer("home_team_id").references(() => teams.id),
  awayTeamId: integer("away_team_id").references(() => teams.id),
  homeTeamName: text("home_team_name").notNull(),
  awayTeamName: text("away_team_name").notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  homeSets: integer("home_sets"),
  awaySets: integer("away_sets"),
  setResults: text("set_results"), // Store as JSON string like "25:23,25:20,25:18"
  matchDate: timestamp("match_date"),
  status: text("status").default("completed"), // completed, scheduled, cancelled
  leagueId: integer("league_id").references(() => leagues.id),
  seriesId: text("series_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teamStats = pgTable("team_stats", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id),
  leagueId: integer("league_id").references(() => leagues.id),
  matchesPlayed: integer("matches_played").default(0),
  matchesWon: integer("matches_won").default(0),
  matchesLost: integer("matches_lost").default(0),
  setsWon: integer("sets_won").default(0),
  setsLost: integer("sets_lost").default(0),
  pointsFor: integer("points_for").default(0),
  pointsAgainst: integer("points_against").default(0),
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

export const teamHighlights = pgTable("team_highlights", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  highlightType: text("highlight_type").notNull(), // 'win_streak', 'comeback', 'dominant_performance', 'milestone'
  title: text("title").notNull(),
  description: text("description").notNull(),
  matchId: integer("match_id").references(() => matches.id),
  value: integer("value"), // streak count, point difference, etc.
  dateAchieved: timestamp("date_achieved").notNull(),
  priority: integer("priority").default(1), // 1-5, higher is more important
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userTeamPreferences = pgTable("user_team_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  isFavorite: boolean("is_favorite").default(false),
  notificationEnabled: boolean("notification_enabled").default(false),
  highlightPreferences: text("highlight_preferences"), // JSON string of preferred highlight types
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Player accounts table for volleyball athlete onboarding
export const playerAccounts = pgTable("player_accounts", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  samsPlayerId: text("sams_player_id").unique().notNull(), // Must match a player's playerId
  playerId: integer("player_id").references(() => players.id), // Link to verified player
  verificationStatus: text("verification_status").default("pending"), // pending, verified, rejected
  verifiedBy: text("verified_by"), // admin, teammates, manual
  verificationCount: integer("verification_count").default(0), // Number of teammate verifications
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Player verifications table for teammate validation
export const playerVerifications = pgTable("player_verifications", {
  id: serial("id").primaryKey(),
  playerAccountId: integer("player_account_id").references(() => playerAccounts.id).notNull(),
  verifiedByPlayerId: integer("verified_by_player_id").references(() => players.id).notNull(),
  verificationNote: text("verification_note"),
  isApproved: boolean("is_approved").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Training sessions table for team coordination
export const trainingSessions = pgTable("training_sessions", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  sessionDate: timestamp("session_date").notNull(),
  location: text("location"),
  organizerId: integer("organizer_id").references(() => playerAccounts.id).notNull(),
  maxParticipants: integer("max_participants").default(20),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Training participants table for session management
export const trainingParticipants = pgTable("training_participants", {
  id: serial("id").primaryKey(),
  trainingSessionId: integer("training_session_id").references(() => trainingSessions.id).notNull(),
  playerAccountId: integer("player_account_id").references(() => playerAccounts.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  status: text("status").default("joined")
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
  homeMatches: many(matches, { relationName: "homeTeam" }),
  awayMatches: many(matches, { relationName: "awayTeam" }),
  stats: many(teamStats),
  highlights: many(teamHighlights),
  userPreferences: many(userTeamPreferences),
}));

export const playersRelations = relations(players, ({ one }) => ({
  team: one(teams, {
    fields: [players.teamId],
    references: [teams.id],
  }),
  account: one(playerAccounts, {
    fields: [players.id],
    references: [playerAccounts.playerId],
  }),
}));

export const playerAccountsRelations = relations(playerAccounts, ({ one }) => ({
  player: one(players, {
    fields: [playerAccounts.playerId],
    references: [players.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  homeTeam: one(teams, {
    fields: [matches.homeTeamId],
    references: [teams.id],
    relationName: "homeTeam",
  }),
  awayTeam: one(teams, {
    fields: [matches.awayTeamId],
    references: [teams.id],
    relationName: "awayTeam",
  }),
  league: one(leagues, {
    fields: [matches.leagueId],
    references: [leagues.id],
  }),
}));

export const teamStatsRelations = relations(teamStats, ({ one }) => ({
  team: one(teams, {
    fields: [teamStats.teamId],
    references: [teams.id],
  }),
  league: one(leagues, {
    fields: [teamStats.leagueId],
    references: [leagues.id],
  }),
}));

export const teamHighlightsRelations = relations(teamHighlights, ({ one }) => ({
  team: one(teams, {
    fields: [teamHighlights.teamId],
    references: [teams.id],
  }),
  match: one(matches, {
    fields: [teamHighlights.matchId],
    references: [matches.id],
  }),
}));

export const userTeamPreferencesRelations = relations(userTeamPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userTeamPreferences.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [userTeamPreferences.teamId],
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

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamStatsSchema = createInsertSchema(teamStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;

export type InsertTeamStats = z.infer<typeof insertTeamStatsSchema>;
export type TeamStats = typeof teamStats.$inferSelect;

export const insertTeamHighlightSchema = createInsertSchema(teamHighlights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserTeamPreferenceSchema = createInsertSchema(userTeamPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeamHighlight = z.infer<typeof insertTeamHighlightSchema>;
export type TeamHighlight = typeof teamHighlights.$inferSelect;

export type InsertUserTeamPreference = z.infer<typeof insertUserTeamPreferenceSchema>;
export type UserTeamPreference = typeof userTeamPreferences.$inferSelect;

export const insertPlayerAccountSchema = createInsertSchema(playerAccounts).omit({
  id: true,
  playerId: true,
  verificationStatus: true,
  verifiedBy: true,
  verificationCount: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlayerVerificationSchema = createInsertSchema(playerVerifications).omit({
  id: true,
  createdAt: true,
});

export const insertTrainingSessionSchema = createInsertSchema(trainingSessions).pick({
  teamId: true,
  title: true,
  description: true,
  sessionDate: true,
  location: true,
  organizerId: true,
  maxParticipants: true,
  isActive: true,
});

export const insertTrainingParticipantSchema = createInsertSchema(trainingParticipants).pick({
  trainingSessionId: true,
  playerAccountId: true,
  status: true,
});

export type InsertPlayerAccount = z.infer<typeof insertPlayerAccountSchema>;
export type PlayerAccount = typeof playerAccounts.$inferSelect;

export type InsertTrainingSession = z.infer<typeof insertTrainingSessionSchema>;
export type TrainingSession = typeof trainingSessions.$inferSelect;

export type InsertTrainingParticipant = z.infer<typeof insertTrainingParticipantSchema>;
export type TrainingParticipant = typeof trainingParticipants.$inferSelect;
