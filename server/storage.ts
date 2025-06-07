import { users, leagues, teams, players, scrapeLogs, matches, teamStats, type User, type InsertUser, type League, type InsertLeague, type Team, type InsertTeam, type Player, type InsertPlayer, type ScrapeLog, type InsertScrapeLog, type Match, type InsertMatch, type TeamStats, type InsertTeamStats } from "@shared/schema";
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

  // Player methods
  getPlayers(): Promise<(Player & { team?: Team })[]>;
  getPlayersByTeam(teamId: number): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, player: Partial<InsertPlayer>): Promise<Player | undefined>;
  deletePlayer(id: number): Promise<boolean>;

  // Match methods
  getMatches(): Promise<(Match & { homeTeam?: Team; awayTeam?: Team; league?: League })[]>;
  getMatchesByLeague(leagueId: number): Promise<Match[]>;
  getMatch(id: number): Promise<Match | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: number, match: Partial<InsertMatch>): Promise<Match | undefined>;
  deleteMatch(id: number): Promise<boolean>;

  // Team Stats methods
  getTeamStats(): Promise<(TeamStats & { team?: Team; league?: League })[]>;
  getTeamStatsByLeague(leagueId: number): Promise<TeamStats[]>;
  getTeamStatsByTeam(teamId: number): Promise<TeamStats[]>;
  createTeamStats(stats: InsertTeamStats): Promise<TeamStats>;
  updateTeamStats(id: number, stats: Partial<InsertTeamStats>): Promise<TeamStats | undefined>;
  updateOrCreateTeamStats(teamId: number, leagueId: number, stats: Partial<InsertTeamStats>): Promise<TeamStats>;

  // Scrape log methods
  getScrapeLogsPaginated(offset: number, limit: number): Promise<ScrapeLog[]>;
  createScrapeLog(log: InsertScrapeLog): Promise<ScrapeLog>;

  // Stats methods
  getStats(): Promise<{
    totalLeagues: number;
    totalTeams: number;
    totalPlayers: number;
    totalMatches: number;
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
    return (result.rowCount || 0) > 0;
  }

  async getTeams(): Promise<(Team & { league?: League })[]> {
    const result = await db
      .select({
        id: teams.id,
        name: teams.name,
        location: teams.location,
        teamId: teams.teamId,
        samsId: teams.samsId,
        homepage: teams.homepage,
        logoUrl: teams.logoUrl,
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
      homepage: row.homepage,
      logoUrl: row.logoUrl,
      leagueId: row.leagueId,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      league: row.league && row.league.id ? row.league : undefined,
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
    return (result.rowCount || 0) > 0;
  }

  async getPlayers(): Promise<(Player & { team?: Team })[]> {
    const result = await db
      .select({
        id: players.id,
        name: players.name,
        position: players.position,
        nationality: players.nationality,
        jerseyNumber: players.jerseyNumber,
        playerId: players.playerId,
        teamId: players.teamId,
        isActive: players.isActive,
        createdAt: players.createdAt,
        updatedAt: players.updatedAt,
        team: {
          id: teams.id,
          name: teams.name,
          location: teams.location,
          teamId: teams.teamId,
          samsId: teams.samsId,
          homepage: teams.homepage,
          logoUrl: teams.logoUrl,
          leagueId: teams.leagueId,
          isActive: teams.isActive,
          createdAt: teams.createdAt,
          updatedAt: teams.updatedAt,
        },
      })
      .from(players)
      .leftJoin(teams, eq(players.teamId, teams.id))
      .orderBy(desc(players.updatedAt));

    return result.map(row => ({
      id: row.id,
      name: row.name,
      position: row.position,
      nationality: row.nationality,
      jerseyNumber: row.jerseyNumber,
      playerId: row.playerId,
      teamId: row.teamId,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      team: row.team && row.team.id ? row.team : undefined,
    }));
  }

  async getPlayersByTeam(teamId: number): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.teamId, teamId));
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player || undefined;
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [newPlayer] = await db
      .insert(players)
      .values({
        ...player,
        updatedAt: new Date(),
      })
      .returning();
    return newPlayer;
  }

  async updatePlayer(id: number, player: Partial<InsertPlayer>): Promise<Player | undefined> {
    const [updatedPlayer] = await db
      .update(players)
      .set({
        ...player,
        updatedAt: new Date(),
      })
      .where(eq(players.id, id))
      .returning();
    return updatedPlayer || undefined;
  }

  async deletePlayer(id: number): Promise<boolean> {
    const result = await db.delete(players).where(eq(players.id, id));
    return (result.rowCount || 0) > 0;
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

  // Match methods implementation
  async getMatches(): Promise<(Match & { homeTeam?: Team; awayTeam?: Team; league?: League })[]> {
    const result = await db
      .select({
        id: matches.id,
        matchId: matches.matchId,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeTeamName: matches.homeTeamName,
        awayTeamName: matches.awayTeamName,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        homeSets: matches.homeSets,
        awaySets: matches.awaySets,
        setResults: matches.setResults,
        matchDate: matches.matchDate,
        status: matches.status,
        leagueId: matches.leagueId,
        seriesId: matches.seriesId,
        createdAt: matches.createdAt,
        updatedAt: matches.updatedAt,
        homeTeam: {
          id: teams.id,
          name: teams.name,
          location: teams.location,
        },
        awayTeam: {
          id: teams.id,
          name: teams.name,
          location: teams.location,
        },
        league: {
          id: leagues.id,
          name: leagues.name,
          category: leagues.category,
        },
      })
      .from(matches)
      .leftJoin(teams, eq(matches.homeTeamId, teams.id))
      .leftJoin(leagues, eq(matches.leagueId, leagues.id))
      .orderBy(desc(matches.matchDate));

    return result.map(row => ({
      id: row.id,
      matchId: row.matchId,
      homeTeamId: row.homeTeamId,
      awayTeamId: row.awayTeamId,
      homeTeamName: row.homeTeamName,
      awayTeamName: row.awayTeamName,
      homeScore: row.homeScore,
      awayScore: row.awayScore,
      homeSets: row.homeSets,
      awaySets: row.awaySets,
      setResults: row.setResults,
      matchDate: row.matchDate,
      status: row.status,
      leagueId: row.leagueId,
      seriesId: row.seriesId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      homeTeam: row.homeTeam && row.homeTeam.id ? row.homeTeam : undefined,
      league: row.league && row.league.id ? row.league : undefined,
    }));
  }

  async getMatchesByLeague(leagueId: number): Promise<Match[]> {
    return await db.select().from(matches).where(eq(matches.leagueId, leagueId));
  }

  async getMatch(id: number): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match || undefined;
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const [newMatch] = await db
      .insert(matches)
      .values(match)
      .returning();
    return newMatch;
  }

  async updateMatch(id: number, match: Partial<InsertMatch>): Promise<Match | undefined> {
    const [updatedMatch] = await db
      .update(matches)
      .set({ ...match, updatedAt: new Date() })
      .where(eq(matches.id, id))
      .returning();
    return updatedMatch || undefined;
  }

  async deleteMatch(id: number): Promise<boolean> {
    const result = await db.delete(matches).where(eq(matches.id, id));
    return result.rowCount > 0;
  }

  // Team Stats methods implementation
  async getTeamStats(): Promise<(TeamStats & { team?: Team; league?: League })[]> {
    const result = await db
      .select({
        id: teamStats.id,
        teamId: teamStats.teamId,
        leagueId: teamStats.leagueId,
        matchesPlayed: teamStats.matchesPlayed,
        matchesWon: teamStats.matchesWon,
        matchesLost: teamStats.matchesLost,
        setsWon: teamStats.setsWon,
        setsLost: teamStats.setsLost,
        pointsFor: teamStats.pointsFor,
        pointsAgainst: teamStats.pointsAgainst,
        createdAt: teamStats.createdAt,
        updatedAt: teamStats.updatedAt,
        team: {
          id: teams.id,
          name: teams.name,
          location: teams.location,
        },
        league: {
          id: leagues.id,
          name: leagues.name,
          category: leagues.category,
        },
      })
      .from(teamStats)
      .leftJoin(teams, eq(teamStats.teamId, teams.id))
      .leftJoin(leagues, eq(teamStats.leagueId, leagues.id))
      .orderBy(desc(teamStats.matchesWon));

    return result.map(row => ({
      id: row.id,
      teamId: row.teamId,
      leagueId: row.leagueId,
      matchesPlayed: row.matchesPlayed,
      matchesWon: row.matchesWon,
      matchesLost: row.matchesLost,
      setsWon: row.setsWon,
      setsLost: row.setsLost,
      pointsFor: row.pointsFor,
      pointsAgainst: row.pointsAgainst,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      team: row.team && row.team.id ? row.team : undefined,
      league: row.league && row.league.id ? row.league : undefined,
    }));
  }

  async getTeamStatsByLeague(leagueId: number): Promise<TeamStats[]> {
    return await db.select().from(teamStats).where(eq(teamStats.leagueId, leagueId));
  }

  async getTeamStatsByTeam(teamId: number): Promise<TeamStats[]> {
    return await db.select().from(teamStats).where(eq(teamStats.teamId, teamId));
  }

  async createTeamStats(stats: InsertTeamStats): Promise<TeamStats> {
    const [newStats] = await db
      .insert(teamStats)
      .values(stats)
      .returning();
    return newStats;
  }

  async updateTeamStats(id: number, stats: Partial<InsertTeamStats>): Promise<TeamStats | undefined> {
    const [updatedStats] = await db
      .update(teamStats)
      .set({ ...stats, updatedAt: new Date() })
      .where(eq(teamStats.id, id))
      .returning();
    return updatedStats || undefined;
  }

  async updateOrCreateTeamStats(teamId: number, leagueId: number, stats: Partial<InsertTeamStats>): Promise<TeamStats> {
    const [existingStats] = await db
      .select()
      .from(teamStats)
      .where(sql`${teamStats.teamId} = ${teamId} AND ${teamStats.leagueId} = ${leagueId}`);

    if (existingStats) {
      const [updatedStats] = await db
        .update(teamStats)
        .set({ ...stats, updatedAt: new Date() })
        .where(eq(teamStats.id, existingStats.id))
        .returning();
      return updatedStats;
    } else {
      const [newStats] = await db
        .insert(teamStats)
        .values({ teamId, leagueId, ...stats })
        .returning();
      return newStats;
    }
  }

  async getStats(): Promise<{
    totalLeagues: number;
    totalTeams: number;
    totalPlayers: number;
    totalMatches: number;
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

    const [playerCount] = await db
      .select({ count: count() })
      .from(players)
      .where(eq(players.isActive, true));

    const [matchCount] = await db
      .select({ count: count() })
      .from(matches);

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
      totalPlayers: playerCount.count,
      totalMatches: matchCount.count,
      totalSeries: seriesCount.count,
      lastScrapeTime: lastScrape?.createdAt?.toISOString() || null,
    };
  }
}

export const storage = new DatabaseStorage();
