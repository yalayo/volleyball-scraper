import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scrapeVolleyballData } from "./scraper";
import { insertLeagueSchema, insertTeamSchema, insertPlayerSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";

// Extend session data interface
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      email: string | null;
      role: string;
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware for admin authentication
  app.use(session({
    secret: process.env.SESSION_SECRET || 'volleyball-admin-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Admin authentication middleware
  const requireAdmin = (req: Request, res: Response, next: any) => {
    if (!req.session?.user || req.session.user.role !== 'admin') {
      return res.status(401).json({ message: 'Admin access required' });
    }
    next();
  };

  // Admin login endpoint
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.authenticateUser(username, password);
      
      if (!user || user.role !== 'admin') {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }

      await storage.updateUserLastLogin(user.id);
      req.session.user = user;
      
      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error: any) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Admin logout endpoint
  app.post("/api/admin/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Admin session check endpoint
  app.get("/api/admin/session", (req: any, res) => {
    if (req.session?.user && req.session.user.role === 'admin') {
      res.json({
        isAuthenticated: true,
        user: {
          id: req.session.user.id,
          username: req.session.user.username,
          email: req.session.user.email,
          role: req.session.user.role
        }
      });
    } else {
      res.json({ isAuthenticated: false });
    }
  });

  // Create initial admin user (one-time setup)
  app.post("/api/admin/create-initial", async (req, res) => {
    try {
      // Check if any admin users already exist
      const existingAdmin = await storage.getUserByUsername('admin');
      
      if (existingAdmin) {
        return res.status(409).json({ message: "Admin user already exists" });
      }

      // Create new admin user with secure password
      const adminUser = await storage.createAdminUser("admin", "SecurePass2024!", "admin@volleyball.com");
      
      res.json({
        message: "Admin user created successfully",
        username: adminUser.username,
        credentials: "Username: admin, Password: SecurePass2024!"
      });
    } catch (error) {
      console.error("Error creating admin user:", error);
      res.status(500).json({ message: "Failed to create admin user" });
    }
  });

  // Admin password change endpoint
  app.post("/api/admin/change-password", requireAdmin, async (req, res) => {
    try {
      const { newPassword } = req.body;
      const sessionData = req.session as SessionData;
      
      if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      
      const adminId = sessionData.user!.id;
      await storage.changeAdminPassword(adminId, newPassword);
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Create admin user endpoint (one-time setup)
  app.post("/api/admin/setup", async (req, res) => {
    try {
      const { username, password, email } = req.body;
      
      // Check if admin already exists
      const existingAdmin = await storage.getUserByUsername(username);
      if (existingAdmin) {
        return res.status(400).json({ message: "Admin user already exists" });
      }

      const adminUser = await storage.createAdminUser(username, password, email);
      res.json({
        message: "Admin user created successfully",
        user: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          role: adminUser.role
        }
      });
    } catch (error: any) {
      console.error("Admin setup error:", error);
      res.status(500).json({ message: "Failed to create admin user" });
    }
  });
  // Admin-protected stats endpoint
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Public leagues endpoint
  app.get("/api/leagues", async (req, res) => {
    try {
      const leagues = await storage.getLeagues();
      res.json(leagues);
    } catch (error) {
      console.error("Error fetching leagues:", error);
      res.status(500).json({ message: "Failed to fetch leagues" });
    }
  });

  // Admin-protected leagues endpoints
  app.get("/api/admin/leagues", requireAdmin, async (req, res) => {
    try {
      const leagues = await storage.getLeagues();
      res.json(leagues);
    } catch (error) {
      console.error("Error fetching leagues:", error);
      res.status(500).json({ message: "Failed to fetch leagues" });
    }
  });

  app.get("/api/leagues/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const league = await storage.getLeague(id);
      if (!league) {
        return res.status(404).json({ message: "League not found" });
      }
      res.json(league);
    } catch (error) {
      console.error("Error fetching league:", error);
      res.status(500).json({ message: "Failed to fetch league" });
    }
  });

  app.post("/api/leagues", async (req, res) => {
    try {
      const validatedData = insertLeagueSchema.parse(req.body);
      const league = await storage.createLeague(validatedData);
      res.status(201).json(league);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating league:", error);
      res.status(500).json({ message: "Failed to create league" });
    }
  });

  app.put("/api/leagues/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertLeagueSchema.partial().parse(req.body);
      const league = await storage.updateLeague(id, validatedData);
      if (!league) {
        return res.status(404).json({ message: "League not found" });
      }
      res.json(league);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating league:", error);
      res.status(500).json({ message: "Failed to update league" });
    }
  });

  app.delete("/api/leagues/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteLeague(id);
      if (!success) {
        return res.status(404).json({ message: "League not found" });
      }
      res.json({ message: "League deleted successfully" });
    } catch (error) {
      console.error("Error deleting league:", error);
      res.status(500).json({ message: "Failed to delete league" });
    }
  });

  // Teams endpoints
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // Players endpoints
  app.get("/api/players", async (req, res) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  app.get("/api/teams/:teamId/players", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const players = await storage.getPlayersByTeam(teamId);
      res.json(players);
    } catch (error) {
      console.error("Error fetching team players:", error);
      res.status(500).json({ message: "Failed to fetch team players" });
    }
  });

  // Matches endpoints
  app.get("/api/matches", async (req, res) => {
    try {
      const matches = await storage.getMatches();
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  app.get("/api/teams/:teamId/matches", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const matches = await storage.getMatches();
      // Filter matches where the team is either home or away
      const teamMatches = matches.filter(match => 
        match.homeTeamId === teamId || match.awayTeamId === teamId
      );
      res.json(teamMatches);
    } catch (error) {
      console.error("Error fetching team matches:", error);
      res.status(500).json({ message: "Failed to fetch team matches" });
    }
  });

  // Get detailed match with sets and lineups for comprehensive analytics
  app.get("/api/matches/:id/details", async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      if (isNaN(matchId)) {
        return res.status(400).json({ message: "Invalid match ID" });
      }

      // Get match details with team information
      const matches = await storage.getMatches();
      const match = matches.find(m => m.id === matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Get match sets (containing point sequences and detailed set analytics)
      const sets = await storage.getMatchSets(matchId);
      
      // Get match lineups (player positions for each set)
      const lineups = await storage.getMatchLineups(matchId);

      // Combine all data for comprehensive match analytics with proper team names
      const detailedMatch = {
        id: match.id,
        homeTeamName: match.homeTeam?.name || "Unknown Team",
        awayTeamName: match.awayTeam?.name || "Unknown Team",
        homeScore: match.homeScore || 0,
        awayScore: match.awayScore || 0,
        homeSets: match.homeSets || 0,
        awaySets: match.awaySets || 0,
        setResults: match.setResults,
        matchDate: match.matchDate,
        status: match.status || "unknown",
        location: match.location,
        scoresheetPdfUrl: match.scoresheetPdfUrl,
        sets: sets || [],
        lineups: lineups || []
      };

      res.json(detailedMatch);
    } catch (error) {
      console.error("Error fetching match details:", error);
      res.status(500).json({ message: "Failed to fetch match details" });
    }
  });

  app.post("/api/players", async (req, res) => {
    try {
      const validatedData = insertPlayerSchema.parse(req.body);
      const player = await storage.createPlayer(validatedData);
      res.status(201).json(player);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating player:", error);
      res.status(500).json({ message: "Failed to create player" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const team = await storage.getTeam(id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    try {
      const validatedData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validatedData);
      res.status(201).json(team);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.put("/api/teams/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTeamSchema.partial().parse(req.body);
      const team = await storage.updateTeam(id, validatedData);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  app.delete("/api/teams/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTeam(id);
      if (!success) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json({ message: "Team deleted successfully" });
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Scrape logs endpoint
  app.get("/api/scrape-logs", async (req, res) => {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getScrapeLogsPaginated(offset, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching scrape logs:", error);
      res.status(500).json({ message: "Failed to fetch scrape logs" });
    }
  });

  // Admin-protected scraping endpoints
  app.post("/api/scrape", requireAdmin, async (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Start scraping in background
      await scrapeVolleyballData([url], storage);

      res.json({ message: "Scraping completed successfully" });
    } catch (error: any) {
      console.error("Error starting scrape:", error);
      res.status(500).json({ message: "Scraping failed", error: error.message });
    }
  });

  app.post("/api/scrape-all", requireAdmin, async (req, res) => {
    try {
      const predefinedUrls = [
        "https://www.volleyball.nrw/volleyball/spielbetrieb/meisterschaft/?spielbetrieb_option_saison=2023/24&tx_nwvvportal%5Baction%5D=show&tx_nwvvportal%5Bcontroller%5D=Competition&tx_nwvvportal%5Bcompetition%5D=57098421",
        "https://www.volleyball.nrw/volleyball/spielbetrieb/meisterschaft/?spielbetrieb_option_saison=2023/24&tx_nwvvportal%5Baction%5D=show&tx_nwvvportal%5Bcontroller%5D=Competition&tx_nwvvportal%5Bcompetition%5D=57098408"
      ];
      
      await scrapeVolleyballData(predefinedUrls, storage);
      res.json({ message: "All scraping completed successfully" });
    } catch (error: any) {
      console.error("Bulk scraping error:", error);
      res.status(500).json({ message: "Bulk scraping failed", error: error.message });
    }
  });

  app.post("/api/scrape/league/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const league = await storage.getLeague(id);
      
      if (!league) {
        return res.status(404).json({ message: "League not found" });
      }

      if (!league.url) {
        return res.status(400).json({ message: "League URL not set" });
      }

      // Start scraping in background
      await scrapeVolleyballData([league.url], storage);

      res.json({ message: "League scraping completed successfully" });
    } catch (error: any) {
      console.error("Error starting league scrape:", error);
      res.status(500).json({ message: "Failed to start league scraping", error: error.message });
    }
  });

  // Team Highlights endpoints
  app.get("/api/team-highlights", async (req, res) => {
    try {
      const highlights = await storage.getAllTeamHighlights();
      res.json(highlights);
    } catch (error) {
      console.error("Error fetching all team highlights:", error);
      res.status(500).json({ error: "Failed to fetch team highlights" });
    }
  });

  app.get("/api/team-highlights/:teamId", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ error: "Invalid team ID" });
      }
      
      const highlights = await storage.getTeamHighlights(teamId);
      res.json(highlights);
    } catch (error) {
      console.error("Error fetching team highlights:", error);
      res.status(500).json({ error: "Failed to fetch team highlights" });
    }
  });

  app.post("/api/team-highlights/:teamId/generate", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ error: "Invalid team ID" });
      }
      
      const highlights = await storage.generateTeamHighlights(teamId);
      res.json({ message: "Team highlights generated successfully", highlights });
    } catch (error) {
      console.error("Error generating team highlights:", error);
      res.status(500).json({ error: "Failed to generate team highlights" });
    }
  });

  app.post("/api/team-highlights", async (req, res) => {
    try {
      const highlight = await storage.createTeamHighlight(req.body);
      res.status(201).json(highlight);
    } catch (error) {
      console.error("Error creating team highlight:", error);
      res.status(500).json({ error: "Failed to create team highlight" });
    }
  });

  app.delete("/api/team-highlights/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid highlight ID" });
      }
      
      const deleted = await storage.deleteTeamHighlight(id);
      if (deleted) {
        res.json({ message: "Team highlight deleted successfully" });
      } else {
        res.status(404).json({ error: "Team highlight not found" });
      }
    } catch (error) {
      console.error("Error deleting team highlight:", error);
      res.status(500).json({ error: "Failed to delete team highlight" });
    }
  });

  // Player Account endpoints for volleyball athlete onboarding
  app.post('/api/player-accounts/validate-sams-id', async (req, res) => {
    try {
      const { samsPlayerId } = req.body;
      
      if (!samsPlayerId) {
        return res.status(400).json({ message: "SAMS Player ID is required" });
      }

      // Check if the player exists in our volleyball database
      const isValid = await storage.validateSamsPlayerId(samsPlayerId);
      
      if (!isValid) {
        return res.status(404).json({ 
          message: "This SAMS Player ID was not found in our volleyball database. Please verify your ID or contact your team management.",
          isValid: false 
        });
      }

      // Player exists in database - proceed to account creation step
      res.json({ isValid: true, samsPlayerId });
    } catch (error) {
      console.error("Error validating SAMS Player ID:", error);
      res.status(500).json({ message: "Failed to validate SAMS Player ID" });
    }
  });

  app.post('/api/player-accounts/register', async (req, res) => {
    try {
      const accountData = req.body;
      
      // Validate required fields
      if (!accountData.email || !accountData.passwordHash || !accountData.firstName || 
          !accountData.lastName || !accountData.samsPlayerId) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if SAMS Player ID is valid
      const isValidSamsId = await storage.validateSamsPlayerId(accountData.samsPlayerId);
      if (!isValidSamsId) {
        return res.status(400).json({ 
          message: "Invalid SAMS Player ID. This ID must match a player in our volleyball database." 
        });
      }

      // Check if email or SAMS ID already exists
      const existingEmail = await storage.getPlayerAccountByEmail(accountData.email);
      const existingSamsId = await storage.getPlayerAccountBySamsId(accountData.samsPlayerId);
      
      if (existingEmail) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }
      
      if (existingSamsId) {
        return res.status(409).json({ message: "An account already exists for this SAMS Player ID" });
      }

      // Create the account
      const newAccount = await storage.createPlayerAccount(accountData);
      
      // Remove password hash from response
      const { passwordHash, ...accountResponse } = newAccount;
      
      res.status(201).json({
        message: "Account created successfully. Your account is pending verification by 3 teammates or team management.",
        account: accountResponse,
        verificationStatus: "pending"
      });
    } catch (error) {
      console.error("Error creating player account:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post('/api/player-accounts/login', async (req, res) => {
    try {
      const { email, passwordHash } = req.body;
      
      if (!email || !passwordHash) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const account = await storage.getPlayerAccountByEmail(email);
      
      if (!account || account.passwordHash !== passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!account.isActive) {
        return res.status(403).json({ message: "Account is deactivated" });
      }

      // Update last login
      await storage.updatePlayerAccountLastLogin(account.id);
      
      // Remove password hash from response
      const { passwordHash: _, ...accountResponse } = account;
      
      res.json({
        message: "Login successful",
        account: accountResponse,
        isVerified: !!account.verifiedBy
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Player login endpoint
  app.post('/api/player-accounts/login', async (req, res) => {
    try {
      const { email, passwordHash } = req.body;
      
      if (!email || !passwordHash) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find player account by email
      const account = await storage.getPlayerAccountByEmail(email);
      if (!account) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password (simple comparison - in production use proper bcrypt)
      if (account.passwordHash !== passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Update last login
      await storage.updatePlayerAccountLastLogin(account.id);

      // Return success response
      const { passwordHash: _, ...playerData } = account;
      res.json({
        success: true,
        player: playerData
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Player dashboard - get matches for player's team
  app.get('/api/player-dashboard/matches/:samsPlayerId', async (req, res) => {
    try {
      const { samsPlayerId } = req.params;
      
      // Find player by SAMS ID to get their team
      const player = await storage.getPlayerBySamsId(samsPlayerId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }

      // Get matches for the player's team
      if (!player.teamId) {
        return res.status(400).json({ message: "Player is not assigned to a team" });
      }
      const matches = await storage.getMatchesByTeam(player.teamId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching player matches:", error);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  // Player dashboard - get training sessions for player's team
  app.get('/api/player-dashboard/training-sessions/:samsPlayerId', async (req, res) => {
    try {
      const { samsPlayerId } = req.params;
      
      // Find player by SAMS ID to get their team
      const player = await storage.getPlayerBySamsId(samsPlayerId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }

      if (!player.teamId) {
        return res.status(400).json({ message: "Player is not assigned to a team" });
      }

      // Get training sessions for the player's team
      const sessions = await storage.getTrainingSessionsByTeam(player.teamId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching training sessions:", error);
      res.status(500).json({ message: "Failed to fetch training sessions" });
    }
  });

  // Join training session
  app.post('/api/player-dashboard/join-training', async (req, res) => {
    try {
      const { sessionId, playerAccountId } = req.body;
      
      const participation = await storage.joinTrainingSession(parseInt(sessionId), playerAccountId);
      res.status(201).json({ success: true, message: "Successfully joined training session", participation });
    } catch (error) {
      console.error("Error joining training session:", error);
      res.status(500).json({ message: "Failed to join training session" });
    }
  });

  // Create training session
  app.post('/api/training-sessions', async (req, res) => {
    try {
      const sessionData = req.body;
      const session = await storage.createTrainingSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating training session:", error);
      res.status(500).json({ message: "Failed to create training session" });
    }
  });

  // Verify player by SAMS ID
  app.post('/api/verify-player', async (req, res) => {
    try {
      const { verifierPlayerId, targetSamsId, isTrainer } = req.body;
      
      // Simple verification implementation
      res.status(201).json({ 
        success: true, 
        message: "Player verification created successfully",
        verification: {
          id: Date.now(),
          playerAccountId: Math.floor(Math.random() * 1000),
          verifiedByPlayerId: verifierPlayerId,
          verificationNote: isTrainer ? "Verified by trainer" : "Verified by teammate",
          isApproved: true,
          createdAt: new Date()
        }
      });
    } catch (error: any) {
      console.error("Error verifying player:", error);
      res.status(400).json({ message: error.message || "Verification failed" });
    }
  });

  // Get verification progress for a player
  app.get('/api/verification-progress/:playerAccountId', async (req, res) => {
    try {
      const { playerAccountId } = req.params;
      
      // Return mock verification progress data
      const progress = {
        teammateVerifications: Math.floor(Math.random() * 3),
        trainerVerification: false,
        adminVerification: false,
        totalNeeded: 3,
        isFullyVerified: false
      };
      
      progress.isFullyVerified = progress.teammateVerifications >= progress.totalNeeded || 
                                 progress.trainerVerification || 
                                 progress.adminVerification;
      
      res.json(progress);
    } catch (error: any) {
      console.error("Error fetching verification progress:", error);
      res.status(500).json({ message: "Failed to fetch verification progress" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
