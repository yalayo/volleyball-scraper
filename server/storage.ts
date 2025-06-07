import { users, leagues, teams, scrapeLogs, type User, type InsertUser, type League, type InsertLeague, type Team, type InsertTeam, type ScrapeLog, type InsertScrapeLog } from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // League methods
  getLeagues(): Promise<League[]>;
  getLeague(id: number): Promise<League | undefined>;
  createLeague(league: InsertLeague): Promise<League>;
  updateLeague(id: number, league: Partial<InsertLeague>): Promise<League | undefined>;
  deleteLeague(id: number): Promise<boolean>;

  // Team methods
  getTeams(): Promise<(Team & { league?: League })[]>;
  getTeamsByLeague(leagueId: number): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;

  // Scrape log methods
  getScrapeLogsPaginated(offset: number, limit: number): Promise<ScrapeLog[]>;
  createScrapeLog(log: InsertScrapeLog): Promise<ScrapeLog>;

  // Stats methods
  getStats(): Promise<{
    totalLeagues: number;
    totalTeams: number;
    totalSeries: number;
    lastScrapeTime: string | null;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getLeagues(): Promise<League[]> {
    return await db.select().from(leagues).orderBy(desc(leagues.updatedAt));
  }

  async getLeague(id: number): Promise<League | undefined> {
    const [league] = await db.select().from(leagues).where(eq(leagues.id, id));
    return league || undefined;
  }

  async createLeague(league: InsertLeague): Promise<League> {
    const [newLeague] = await db
      .insert(leagues)
      .values({
        ...league,
        updatedAt: new Date(),
      })
      .returning();
    return newLeague;
  }

  async updateLeague(id: number, league: Partial<InsertLeague>): Promise<League | undefined> {
    const [updatedLeague] = await db
      .update(leagues)
      .set({
        ...league,
        updatedAt: new Date(),
      })
      .where(eq(leagues.id, id))
      .returning();
    return updatedLeague || undefined;
  }

  async deleteLeague(id: number): Promise<boolean> {
    const result = await db.delete(leagues).where(eq(leagues.id, id));
    return result.rowCount > 0;
  }

  async getTeams(): Promise<(Team & { league?: League })[]> {
    const result = await db
      .select({
        id: teams.id,
        name: teams.name,
        location: teams.location,
        teamId: teams.teamId,
        samsId: teams.samsId,
        leagueId: teams.leagueId,
        isActive: teams.isActive,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
        league: {
          id: leagues.id,
          name: leagues.name,
          category: leagues.category,
          url: leagues.url,
          seriesId: leagues.seriesId,
          samsId: leagues.samsId,
          teamsCount: leagues.teamsCount,
          isActive: leagues.isActive,
          createdAt: leagues.createdAt,
          updatedAt: leagues.updatedAt,
        },
      })
      .from(teams)
      .leftJoin(leagues, eq(teams.leagueId, leagues.id))
      .orderBy(desc(teams.updatedAt));

    return result.map(row => ({
      id: row.id,
      name: row.name,
      location: row.location,
      teamId: row.teamId,
      samsId: row.samsId,
      leagueId: row.leagueId,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      league: row.league.id ? row.league : undefined,
    }));
  }

  async getTeamsByLeague(leagueId: number): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.leagueId, leagueId));
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db
      .insert(teams)
      .values({
        ...team,
        updatedAt: new Date(),
      })
      .returning();
    return newTeam;
  }

  async updateTeam(id: number, team: Partial<InsertTeam>): Promise<Team | undefined> {
    const [updatedTeam] = await db
      .update(teams)
      .set({
        ...team,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, id))
      .returning();
    return updatedTeam || undefined;
  }

  async deleteTeam(id: number): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id));
    return result.rowCount > 0;
  }

  async getScrapeLogsPaginated(offset: number, limit: number): Promise<ScrapeLog[]> {
    return await db
      .select()
      .from(scrapeLogs)
      .orderBy(desc(scrapeLogs.createdAt))
      .offset(offset)
      .limit(limit);
  }

  async createScrapeLog(log: InsertScrapeLog): Promise<ScrapeLog> {
    const [newLog] = await db
      .insert(scrapeLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getStats(): Promise<{
    totalLeagues: number;
    totalTeams: number;
    totalSeries: number;
    lastScrapeTime: string | null;
  }> {
    const [leagueCount] = await db
      .select({ count: count() })
      .from(leagues)
      .where(eq(leagues.isActive, true));

    const [teamCount] = await db
      .select({ count: count() })
      .from(teams)
      .where(eq(teams.isActive, true));

    const [seriesCount] = await db
      .select({ count: count(leagues.seriesId) })
      .from(leagues)
      .where(sql`${leagues.seriesId} IS NOT NULL AND ${leagues.isActive} = true`);

    const [lastScrape] = await db
      .select({ createdAt: scrapeLogs.createdAt })
      .from(scrapeLogs)
      .where(eq(scrapeLogs.status, 'success'))
      .orderBy(desc(scrapeLogs.createdAt))
      .limit(1);

    return {
      totalLeagues: leagueCount.count,
      totalTeams: teamCount.count,
      totalSeries: seriesCount.count,
      lastScrapeTime: lastScrape?.createdAt?.toISOString() || null,
    };
  }
}

export const storage = new DatabaseStorage();
