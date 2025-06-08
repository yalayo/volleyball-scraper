import { users, leagues, teams, players, scrapeLogs, matches, teamStats, teamHighlights, userTeamPreferences, type User, type InsertUser, type League, type InsertLeague, type Team, type InsertTeam, type Player, type InsertPlayer, type ScrapeLog, type InsertScrapeLog, type Match, type InsertMatch, type TeamStats, type InsertTeamStats, type TeamHighlight, type InsertTeamHighlight, type UserTeamPreference, type InsertUserTeamPreference } from "@shared/schema";
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

  // Team Highlights methods
  getTeamHighlights(teamId: number): Promise<(TeamHighlight & { team?: Team; match?: Match })[]>;
  getAllTeamHighlights(): Promise<(TeamHighlight & { team?: Team; match?: Match })[]>;
  createTeamHighlight(highlight: InsertTeamHighlight): Promise<TeamHighlight>;
  updateTeamHighlight(id: number, highlight: Partial<InsertTeamHighlight>): Promise<TeamHighlight | undefined>;
  deleteTeamHighlight(id: number): Promise<boolean>;
  generateTeamHighlights(teamId: number): Promise<TeamHighlight[]>;

  // User Team Preferences methods
  getUserTeamPreferences(userId: number): Promise<(UserTeamPreference & { team?: Team })[]>;
  getUserTeamPreference(userId: number, teamId: number): Promise<UserTeamPreference | undefined>;
  createUserTeamPreference(preference: InsertUserTeamPreference): Promise<UserTeamPreference>;
  updateUserTeamPreference(id: number, preference: Partial<InsertUserTeamPreference>): Promise<UserTeamPreference | undefined>;
  deleteUserTeamPreference(id: number): Promise<boolean>;
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
    const matchesData = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.matchDate));

    // Fetch related data separately to avoid complex joins
    const enrichedMatches = await Promise.all(
      matchesData.map(async (match) => {
        const [homeTeam, awayTeam, league] = await Promise.all([
          match.homeTeamId ? this.getTeam(match.homeTeamId) : null,
          match.awayTeamId ? this.getTeam(match.awayTeamId) : null,
          match.leagueId ? this.getLeague(match.leagueId) : null,
        ]);

        return {
          ...match,
          homeTeam: homeTeam || undefined,
          awayTeam: awayTeam || undefined,
          league: league || undefined,
        };
      })
    );

    return enrichedMatches;
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
    return (result.rowCount || 0) > 0;
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

  // Team Highlights methods implementation
  async getTeamHighlights(teamId: number): Promise<(TeamHighlight & { team?: Team; match?: Match })[]> {
    const result = await db
      .select({
        id: teamHighlights.id,
        teamId: teamHighlights.teamId,
        highlightType: teamHighlights.highlightType,
        title: teamHighlights.title,
        description: teamHighlights.description,
        matchId: teamHighlights.matchId,
        value: teamHighlights.value,
        dateAchieved: teamHighlights.dateAchieved,
        priority: teamHighlights.priority,
        isActive: teamHighlights.isActive,
        createdAt: teamHighlights.createdAt,
        updatedAt: teamHighlights.updatedAt,
        team: teams,
        match: matches,
      })
      .from(teamHighlights)
      .leftJoin(teams, eq(teamHighlights.teamId, teams.id))
      .leftJoin(matches, eq(teamHighlights.matchId, matches.id))
      .where(eq(teamHighlights.teamId, teamId))
      .orderBy(desc(teamHighlights.priority), desc(teamHighlights.dateAchieved));

    return result.map(row => ({
      id: row.id,
      teamId: row.teamId,
      highlightType: row.highlightType,
      title: row.title,
      description: row.description,
      matchId: row.matchId,
      value: row.value,
      dateAchieved: row.dateAchieved,
      priority: row.priority,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      team: row.team,
      match: row.match,
    }));
  }

  async getAllTeamHighlights(): Promise<(TeamHighlight & { team?: Team; match?: Match })[]> {
    const result = await db
      .select({
        id: teamHighlights.id,
        teamId: teamHighlights.teamId,
        highlightType: teamHighlights.highlightType,
        title: teamHighlights.title,
        description: teamHighlights.description,
        matchId: teamHighlights.matchId,
        value: teamHighlights.value,
        dateAchieved: teamHighlights.dateAchieved,
        priority: teamHighlights.priority,
        isActive: teamHighlights.isActive,
        createdAt: teamHighlights.createdAt,
        updatedAt: teamHighlights.updatedAt,
        team: teams,
        match: matches,
      })
      .from(teamHighlights)
      .leftJoin(teams, eq(teamHighlights.teamId, teams.id))
      .leftJoin(matches, eq(teamHighlights.matchId, matches.id))
      .where(eq(teamHighlights.isActive, true))
      .orderBy(desc(teamHighlights.priority), desc(teamHighlights.dateAchieved));

    return result.map(row => ({
      id: row.id,
      teamId: row.teamId,
      highlightType: row.highlightType,
      title: row.title,
      description: row.description,
      matchId: row.matchId,
      value: row.value,
      dateAchieved: row.dateAchieved,
      priority: row.priority,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      team: row.team,
      match: row.match,
    }));
  }

  async createTeamHighlight(highlight: InsertTeamHighlight): Promise<TeamHighlight> {
    const [newHighlight] = await db
      .insert(teamHighlights)
      .values(highlight)
      .returning();
    return newHighlight;
  }

  async updateTeamHighlight(id: number, highlight: Partial<InsertTeamHighlight>): Promise<TeamHighlight | undefined> {
    const [updatedHighlight] = await db
      .update(teamHighlights)
      .set({ ...highlight, updatedAt: new Date() })
      .where(eq(teamHighlights.id, id))
      .returning();
    return updatedHighlight || undefined;
  }

  async deleteTeamHighlight(id: number): Promise<boolean> {
    const result = await db.delete(teamHighlights).where(eq(teamHighlights.id, id));
    return (result.rowCount || 0) > 0;
  }

  async generateTeamHighlights(teamId: number): Promise<TeamHighlight[]> {
    const highlights: TeamHighlight[] = [];
    
    // Get team matches ordered by date
    const teamMatches = await db
      .select()
      .from(matches)
      .where(sql`${matches.homeTeamId} = ${teamId} OR ${matches.awayTeamId} = ${teamId}`)
      .orderBy(desc(matches.matchDate));

    if (teamMatches.length === 0) return highlights;

    // Analyze for win streaks
    let currentWinStreak = 0;
    let maxWinStreak = 0;
    let streakStartDate: Date | null = null;

    for (const match of teamMatches.reverse()) {
      const isHome = match.homeTeamId === teamId;
      const teamWon = isHome ? 
        (match.homeSets || 0) > (match.awaySets || 0) : 
        (match.awaySets || 0) > (match.homeSets || 0);

      if (teamWon) {
        if (currentWinStreak === 0) {
          streakStartDate = match.matchDate;
        }
        currentWinStreak++;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else {
        currentWinStreak = 0;
      }
    }

    // Create win streak highlight if significant
    if (maxWinStreak >= 3) {
      const highlight = await this.createTeamHighlight({
        teamId,
        highlightType: 'win_streak',
        title: `${maxWinStreak}-Game Win Streak`,
        description: `Achieved an impressive ${maxWinStreak} consecutive victories`,
        value: maxWinStreak,
        dateAchieved: streakStartDate || new Date(),
        priority: maxWinStreak >= 5 ? 5 : 4,
      });
      highlights.push(highlight);
    }

    // Find dominant performances (3-0 wins)
    const dominantWins = teamMatches.filter(match => {
      const isHome = match.homeTeamId === teamId;
      const teamSets = isHome ? match.homeSets : match.awaySets;
      const opponentSets = isHome ? match.awaySets : match.homeSets;
      return teamSets === 3 && opponentSets === 0;
    });

    if (dominantWins.length >= 3) {
      const highlight = await this.createTeamHighlight({
        teamId,
        highlightType: 'dominant_performance',
        title: `${dominantWins.length} Dominant Victories`,
        description: `Secured ${dominantWins.length} straight-set (3-0) victories this season`,
        value: dominantWins.length,
        dateAchieved: dominantWins[0]?.matchDate || new Date(),
        priority: 3,
      });
      highlights.push(highlight);
    }

    // Find comeback victories (won after losing first set)
    const comebackWins = teamMatches.filter(match => {
      if (!match.setResults) return false;
      
      const sets = match.setResults.split(',').map(s => s.trim());
      if (sets.length < 4) return false;

      const isHome = match.homeTeamId === teamId;
      const teamWon = isHome ? 
        (match.homeSets || 0) > (match.awaySets || 0) : 
        (match.awaySets || 0) > (match.homeSets || 0);

      if (!teamWon) return false;

      // Check if team lost first set
      const firstSet = sets[0];
      const [score1, score2] = firstSet.split(':').map(s => parseInt(s.trim()));
      const teamLostFirstSet = isHome ? score1 < score2 : score2 < score1;

      return teamLostFirstSet;
    });

    if (comebackWins.length >= 2) {
      const highlight = await this.createTeamHighlight({
        teamId,
        highlightType: 'comeback',
        title: `${comebackWins.length} Comeback Victories`,
        description: `Showed resilience with ${comebackWins.length} comeback wins after losing the first set`,
        value: comebackWins.length,
        dateAchieved: comebackWins[0]?.matchDate || new Date(),
        priority: 4,
      });
      highlights.push(highlight);
    }

    return highlights;
  }

  // User Team Preferences methods implementation
  async getUserTeamPreferences(userId: number): Promise<(UserTeamPreference & { team?: Team })[]> {
    const result = await db
      .select({
        id: userTeamPreferences.id,
        userId: userTeamPreferences.userId,
        teamId: userTeamPreferences.teamId,
        isFavorite: userTeamPreferences.isFavorite,
        notificationEnabled: userTeamPreferences.notificationEnabled,
        highlightPreferences: userTeamPreferences.highlightPreferences,
        createdAt: userTeamPreferences.createdAt,
        updatedAt: userTeamPreferences.updatedAt,
        team: teams,
      })
      .from(userTeamPreferences)
      .leftJoin(teams, eq(userTeamPreferences.teamId, teams.id))
      .where(eq(userTeamPreferences.userId, userId));

    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      teamId: row.teamId,
      isFavorite: row.isFavorite,
      notificationEnabled: row.notificationEnabled,
      highlightPreferences: row.highlightPreferences,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      team: row.team,
    }));
  }

  async getUserTeamPreference(userId: number, teamId: number): Promise<UserTeamPreference | undefined> {
    const [preference] = await db
      .select()
      .from(userTeamPreferences)
      .where(sql`${userTeamPreferences.userId} = ${userId} AND ${userTeamPreferences.teamId} = ${teamId}`);
    return preference || undefined;
  }

  async createUserTeamPreference(preference: InsertUserTeamPreference): Promise<UserTeamPreference> {
    const [newPreference] = await db
      .insert(userTeamPreferences)
      .values(preference)
      .returning();
    return newPreference;
  }

  async updateUserTeamPreference(id: number, preference: Partial<InsertUserTeamPreference>): Promise<UserTeamPreference | undefined> {
    const [updatedPreference] = await db
      .update(userTeamPreferences)
      .set({ ...preference, updatedAt: new Date() })
      .where(eq(userTeamPreferences.id, id))
      .returning();
    return updatedPreference || undefined;
  }

  async deleteUserTeamPreference(id: number): Promise<boolean> {
    const result = await db.delete(userTeamPreferences).where(eq(userTeamPreferences.id, id));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();
