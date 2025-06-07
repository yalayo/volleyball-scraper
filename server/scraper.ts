import axios from "axios";
import * as cheerio from "cheerio";
import { storage, type IStorage } from "./storage";
import type { InsertLeague, InsertTeam, InsertScrapeLog } from "@shared/schema";

interface ScrapedData {
  leagues: InsertLeague[];
  teams: InsertTeam[];
  seriesIds: string[];
  samsIds: string[];
}

export async function scrapeVolleyballData(
  url: string,
  leagueName: string,
  category: string,
  storageInstance: IStorage = storage
): Promise<void> {
  const startTime = Date.now();
  let scrapedData: ScrapedData = {
    leagues: [],
    teams: [],
    seriesIds: [],
    samsIds: []
  };

  try {
    await storageInstance.createScrapeLog({
      operation: `Scrape ${leagueName}`,
      status: 'info',
      message: `Starting scrape of ${leagueName} from ${url}`,
      details: `Category: ${category}`,
      duration: 0,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0
    });

    // Fetch the webpage
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract series ID from URL or page content
    let seriesId: string | null = null;
    const urlMatch = url.match(/LeaguePresenter\.matchSeriesId=(\d+)/);
    if (urlMatch) {
      seriesId = urlMatch[1];
      scrapedData.seriesIds.push(seriesId);
    }

    // Extract SAMS IDs from samsCmsComponent patterns
    const samsIds: string[] = [];
    $('[id*="samsCmsComponent_"]').each((_, element) => {
      const id = $(element).attr('id');
      if (id) {
        const match = id.match(/samsCmsComponent_(\d+)/);
        if (match) {
          samsIds.push(match[1]);
          scrapedData.samsIds.push(match[1]);
        }
      }
    });

    // Create or update league
    const leagueData: InsertLeague = {
      name: leagueName,
      category,
      url,
      seriesId,
      samsId: samsIds[0] || null,
      teamsCount: 0,
      isActive: true
    };

    const existingLeagues = await storageInstance.getLeagues();
    let league = existingLeagues.find(l => l.name === leagueName && l.category === category);
    
    if (league) {
      league = await storageInstance.updateLeague(league.id, leagueData);
    } else {
      league = await storageInstance.createLeague(leagueData);
    }

    if (!league) {
      throw new Error("Failed to create or update league");
    }

    scrapedData.leagues.push(leagueData);

    // Extract team information
    const teams: InsertTeam[] = [];
    let teamCount = 0;

    // Look for team links with teamId parameters
    $('a[href*="LeaguePresenter.teamListView.teamId"]').each((_, element) => {
      const href = $(element).attr('href');
      const teamName = $(element).text().trim();
      
      if (href && teamName) {
        const teamIdMatch = href.match(/LeaguePresenter\.teamListView\.teamId=(\d+)/);
        if (teamIdMatch) {
          const teamId = teamIdMatch[1];
          
          // Extract location from team name if possible
          let location: string | null = null;
          const locationMatch = teamName.match(/^(.+?)\s+(.+)$/);
          if (locationMatch) {
            location = locationMatch[1];
          }

          const teamData: InsertTeam = {
            name: teamName,
            location,
            teamId,
            samsId: null, // Will be filled if found in team-specific scraping
            leagueId: league.id,
            isActive: true
          };

          teams.push(teamData);
          scrapedData.teams.push(teamData);
          teamCount++;
        }
      }
    });

    // Alternative: Look for team data in tables
    if (teams.length === 0) {
      $('table tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length >= 2) {
          const teamName = cells.eq(0).text().trim();
          const teamLinkCell = cells.find('a[href*="teamId"]');
          
          if (teamName && teamLinkCell.length > 0) {
            const href = teamLinkCell.attr('href');
            if (href) {
              const teamIdMatch = href.match(/teamId=(\d+)/);
              if (teamIdMatch) {
                const teamId = teamIdMatch[1];
                
                const teamData: InsertTeam = {
                  name: teamName,
                  location: null,
                  teamId,
                  samsId: null,
                  leagueId: league.id,
                  isActive: true
                };

                teams.push(teamData);
                scrapedData.teams.push(teamData);
                teamCount++;
              }
            }
          }
        }
      });
    }

    // Save teams to database
    const existingTeams = await storageInstance.getTeamsByLeague(league.id);
    let createdCount = 0;
    let updatedCount = 0;

    for (const teamData of teams) {
      const existingTeam = existingTeams.find(t => t.teamId === teamData.teamId);
      
      if (existingTeam) {
        await storageInstance.updateTeam(existingTeam.id, teamData);
        updatedCount++;
      } else {
        await storageInstance.createTeam(teamData);
        createdCount++;
      }
    }

    // Update league team count
    await storageInstance.updateLeague(league.id, { teamsCount: teamCount });

    const duration = Date.now() - startTime;

    // Log successful completion
    await storageInstance.createScrapeLog({
      operation: `Scrape ${leagueName}`,
      status: 'success',
      message: `Successfully scraped ${leagueName}`,
      details: `Found ${teamCount} teams, ${scrapedData.seriesIds.length} series, ${scrapedData.samsIds.length} SAMS components`,
      duration,
      recordsProcessed: teamCount,
      recordsCreated: createdCount,
      recordsUpdated: updatedCount
    });

    console.log(`Scraping completed for ${leagueName}: ${teamCount} teams processed`);

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await storageInstance.createScrapeLog({
      operation: `Scrape ${leagueName}`,
      status: 'error',
      message: `Failed to scrape ${leagueName}: ${errorMessage}`,
      details: error instanceof Error ? error.stack : undefined,
      duration,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0
    });

    console.error(`Scraping failed for ${leagueName}:`, error);
    throw error;
  }
}

export async function scrapeMultipleLeagues(urls: string[]): Promise<void> {
  for (const url of urls) {
    try {
      // Extract league info from URL or use defaults
      const leagueName = `League from ${url}`;
      const category = 'Unknown';
      
      await scrapeVolleyballData(url, leagueName, category);
      
      // Add delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to scrape ${url}:`, error);
      // Continue with next URL
    }
  }
}
