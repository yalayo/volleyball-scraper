import axios from "axios";
import * as cheerio from "cheerio";
import { storage, type IStorage } from "./storage";
import type { InsertLeague, InsertTeam, InsertPlayer, InsertScrapeLog } from "@shared/schema";

// Helper functions for enhanced player detection
function isValidPlayerName(text: string): boolean {
  if (!text || text.length < 3 || text.length > 50) return false;
  
  // Must contain at least one space (first and last name)
  if (!text.includes(' ')) return false;
  
  // Should not contain numbers (except maybe Roman numerals)
  if (/\d/.test(text) && !/\b[IVX]+\b/.test(text)) return false;
  
  // Should not be common table headers or labels
  const excludePatterns = [
    /^(name|spieler|player|position|nummer|number|trikot|jersey)$/i,
    /^(trainer|coach|betreuer|manager)$/i,
    /^(datum|date|zeit|time|ort|location)$/i
  ];
  
  return !excludePatterns.some(pattern => pattern.test(text.trim()));
}

function isValidPosition(text: string): boolean {
  if (!text || text.length > 20) return false;
  
  const validPositions = [
    'Trainer', 'Coach', 'Libero', 'Zuspieler', 'Außenangreifer', 'Mittelblocker',
    'Diagonal', 'Universalspieler', 'Betreuer', 'Manager', 'Kapitän', 'Captain',
    'T', 'L', 'Z', 'A', 'M', 'D', 'U', 'K'
  ];
  
  return validPositions.some(pos => text.toLowerCase().includes(pos.toLowerCase()));
}

function extractPlayerFromText(text: string): { name: string; position: string | null; jerseyNumber: string | null } | null {
  if (!text || text.length < 3 || text.length > 100) return null;
  
  // Pattern 1: "12. Max Mustermann (Trainer)"
  let match = text.match(/^(\d+)\.?\s*([A-Za-zÄÖÜäöüß\s\-']+?)\s*(?:\(([^)]+)\))?$/);
  if (match) {
    const name = match[2].trim();
    if (isValidPlayerName(name)) {
      return {
        name,
        jerseyNumber: match[1],
        position: match[3] || null
      };
    }
  }
  
  // Pattern 2: "Max Mustermann (12)"
  match = text.match(/^([A-Za-zÄÖÜäöüß\s\-']+?)\s*\((\d+)\)$/);
  if (match) {
    const name = match[1].trim();
    if (isValidPlayerName(name)) {
      return {
        name,
        jerseyNumber: match[2],
        position: null
      };
    }
  }
  
  // Pattern 3: "Max Mustermann - Trainer"
  match = text.match(/^([A-Za-zÄÖÜäöüß\s\-']+?)\s*[-–]\s*([A-Za-z]+)$/);
  if (match) {
    const name = match[1].trim();
    const position = match[2].trim();
    if (isValidPlayerName(name) && isValidPosition(position)) {
      return {
        name,
        jerseyNumber: null,
        position
      };
    }
  }
  
  // Pattern 4: Simple name
  if (isValidPlayerName(text.trim())) {
    return {
      name: text.trim(),
      jerseyNumber: null,
      position: null
    };
  }
  
  return null;
}

interface ScrapedData {
  leagues: InsertLeague[];
  teams: InsertTeam[];
  players: InsertPlayer[];
  seriesIds: string[];
  samsIds: string[];
}

async function scrapeTeamPlayers(
  baseUrl: string,
  teamId: string,
  teamDbId: number,
  storageInstance: IStorage
): Promise<InsertPlayer[]> {
  const players: InsertPlayer[] = [];
  
  try {
    // Construct team detail URL to access player information
    const teamUrl = baseUrl.replace(
      /(&LeaguePresenter\.view=teamOverview.*)?$/,
      `&LeaguePresenter.teamListView.view=teamMain&LeaguePresenter.view=teamOverview&LeaguePresenter.teamListView.teamId=${teamId}`
    );

    const response = await axios.get(teamUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Enhanced player detection with multiple methods
    const foundNames = new Set<string>(); // Track duplicates
    
    // Method 1: Look for player tables with various column arrangements
    $('table').each((_, table) => {
      const $table = $(table);
      const rows = $table.find('tr');
      
      rows.each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td, th');
        
        if (cells.length >= 1) {
          // Try different column arrangements
          for (let i = 0; i < cells.length; i++) {
            const cellText = cells.eq(i).text().trim();
            
            // Look for name patterns in each cell
            if (isValidPlayerName(cellText) && !foundNames.has(cellText.toLowerCase())) {
              foundNames.add(cellText.toLowerCase());
              
              // Try to find jersey number in adjacent cells
              let jerseyNumber = null;
              let position = null;
              
              // Check previous and next cells for numbers/positions
              if (i > 0) {
                const prevText = cells.eq(i - 1).text().trim();
                if (/^\d+$/.test(prevText)) jerseyNumber = prevText;
              }
              if (i < cells.length - 1) {
                const nextText = cells.eq(i + 1).text().trim();
                if (/^\d+$/.test(nextText)) jerseyNumber = nextText;
                else if (isValidPosition(nextText)) position = nextText;
              }
              if (i < cells.length - 2) {
                const nextNextText = cells.eq(i + 2).text().trim();
                if (isValidPosition(nextNextText)) position = nextNextText;
              }
              
              players.push({
                name: cellText,
                position: position || null,
                jerseyNumber: jerseyNumber || null,
                teamId: teamDbId,
                isActive: true
              });
            }
          }
        }
      });
    });

    // Method 2: Look for player information in list structures
    $('ul li, ol li, .list-item, .player-item').each((_, element) => {
      const $element = $(element);
      const text = $element.text().trim();
      
      const playerInfo = extractPlayerFromText(text);
      if (playerInfo && !foundNames.has(playerInfo.name.toLowerCase())) {
        foundNames.add(playerInfo.name.toLowerCase());
        players.push({
          ...playerInfo,
          teamId: teamDbId,
          isActive: true
        });
      }
    });

    // Method 3: Look for player cards or divs
    $('.player, .spieler, [class*="player"], [class*="spieler"], .team-member, .roster').each((_, element) => {
      const $element = $(element);
      const text = $element.text().trim();
      
      const playerInfo = extractPlayerFromText(text);
      if (playerInfo && !foundNames.has(playerInfo.name.toLowerCase())) {
        foundNames.add(playerInfo.name.toLowerCase());
        players.push({
          ...playerInfo,
          teamId: teamDbId,
          isActive: true
        });
      }
    });

    // Method 4: Scan all text content for player patterns
    if (players.length < 5) { // Only if we haven't found many players yet
      $('p, span, div').each((_, element) => {
        const $element = $(element);
        const text = $element.text().trim();
        
        // Skip if too long (likely not a single player entry)
        if (text.length > 80) return;
        
        const playerInfo = extractPlayerFromText(text);
        if (playerInfo && !foundNames.has(playerInfo.name.toLowerCase())) {
          foundNames.add(playerInfo.name.toLowerCase());
          players.push({
            ...playerInfo,
            teamId: teamDbId,
            isActive: true
          });
        }
      });
    }

    // Method 5: Look for structured data in scripts or JSON
    $('script').each((_, script) => {
      const content = $(script).html();
      if (content) {
        // Look for player arrays in JavaScript
        const playerArrayMatch = content.match(/players?\s*[:=]\s*\[(.*?)\]/gi);
        if (playerArrayMatch) {
          try {
            const playersData = playerArrayMatch[1];
            // Extract quoted names
            const nameMatches = playersData.match(/"([A-Za-zÄÖÜäöüß\s\-']{3,40})"/g);
            if (nameMatches) {
              nameMatches.forEach(match => {
                const name = match.replace(/"/g, '');
                if (isValidPlayerName(name) && !foundNames.has(name.toLowerCase())) {
                  foundNames.add(name.toLowerCase());
                  players.push({
                    name,
                    position: null,
                    jerseyNumber: null,
                    teamId: teamDbId,
                    isActive: true
                  });
                }
              });
            }
          } catch (error) {
            // Ignore parsing errors
          }
        }
      }
    });

    // Save players to database
    const existingPlayers = await storageInstance.getPlayersByTeam(teamDbId);
    
    for (const playerData of players) {
      const existingPlayer = existingPlayers.find(p => p.name === playerData.name);
      
      if (existingPlayer) {
        await storageInstance.updatePlayer(existingPlayer.id, playerData);
      } else {
        await storageInstance.createPlayer(playerData);
      }
    }

    console.log(`Found ${players.length} players for team ${teamId}`);
    
  } catch (error) {
    console.error(`Error scraping players for team ${teamId}:`, error);
  }

  return players;
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
    players: [],
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

    // Extract team information from the new structure
    const teams: InsertTeam[] = [];
    let teamCount = 0;

    // Look for teams in samsCmsTeamListComponentBlock structure
    $('.samsCmsComponentBlock.samsCmsTeamListComponentBlock').each((_, element) => {
      const $teamBlock = $(element);
      
      // Extract team name from header
      const teamName = $teamBlock.find('.samsCmsComponentBlockHeader').text().trim();
      
      // Extract team ID from main team link
      const teamLink = $teamBlock.find('a[href*="LeaguePresenter.teamListView.teamId"]').first();
      const href = teamLink.attr('href');
      
      // Extract homepage URL
      const homepageLink = $teamBlock.find('a.samsExternalLink[target="_blank"]');
      const homepage = homepageLink.attr('href') || null;
      
      // Extract logo URL
      const logoImg = $teamBlock.find('.samsCmsTeamListComponentLogoImage img');
      const logoUrl = logoImg.attr('src') || null;
      
      if (href && teamName) {
        const teamIdMatch = href.match(/LeaguePresenter\.teamListView\.teamId=(\d+)/);
        if (teamIdMatch) {
          const teamId = teamIdMatch[1];
          
          // Extract location from team name if possible
          let location: string | null = null;
          const locationMatch = teamName.match(/^(.+?)\s+(II|III|IV|2|3|4)$/) || teamName.match(/^([A-Z]+)\s+(.+)$/);
          if (locationMatch) {
            location = locationMatch[1];
          }

          const teamData: InsertTeam = {
            name: teamName,
            location,
            teamId,
            samsId: null,
            homepage,
            logoUrl,
            leagueId: league.id,
            isActive: true
          };

          teams.push(teamData);
          scrapedData.teams.push(teamData);
          teamCount++;
        }
      }
    });

    // Fallback: Look for team links with teamId parameters (old method)
    if (teams.length === 0) {
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
              samsId: null,
              homepage: null,
              logoUrl: null,
              leagueId: league.id,
              isActive: true
            };

            teams.push(teamData);
            scrapedData.teams.push(teamData);
            teamCount++;
          }
        }
      });
    }

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

    // Save teams to database and collect team database IDs for player scraping
    const existingTeams = await storageInstance.getTeamsByLeague(league.id);
    let createdCount = 0;
    let updatedCount = 0;
    const teamDatabaseIds: { teamId: string; dbId: number }[] = [];

    for (const teamData of teams) {
      const existingTeam = existingTeams.find(t => t.teamId === teamData.teamId);
      
      if (existingTeam) {
        await storageInstance.updateTeam(existingTeam.id, teamData);
        teamDatabaseIds.push({ teamId: teamData.teamId, dbId: existingTeam.id });
        updatedCount++;
      } else {
        const newTeam = await storageInstance.createTeam(teamData);
        teamDatabaseIds.push({ teamId: teamData.teamId, dbId: newTeam.id });
        createdCount++;
      }
    }

    // Scrape player information for each team
    let totalPlayers = 0;
    for (const team of teamDatabaseIds) {
      try {
        const players = await scrapeTeamPlayers(url, team.teamId, team.dbId, storageInstance);
        scrapedData.players.push(...players);
        totalPlayers += players.length;
        
        // Add delay between team requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to scrape players for team ${team.teamId}:`, error);
        // Continue with next team
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
      details: `Found ${teamCount} teams, ${totalPlayers} players, ${scrapedData.seriesIds.length} series, ${scrapedData.samsIds.length} SAMS components`,
      duration,
      recordsProcessed: teamCount + totalPlayers,
      recordsCreated: createdCount,
      recordsUpdated: updatedCount
    });

    console.log(`Scraping completed for ${leagueName}: ${teamCount} teams and ${totalPlayers} players processed`);

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
