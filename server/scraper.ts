import axios from "axios";
import * as cheerio from "cheerio";
import { storage, type IStorage } from "./storage";
// import { pdfParser } from "./pdf-parser";
import type { InsertLeague, InsertTeam, InsertPlayer, InsertMatch, InsertTeamStats, InsertScrapeLog, InsertMatchSet, InsertMatchLineup } from "@shared/schema";

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

interface TeamContactInfo {
  email: string | null;
  address: string | null;
}

export async function scrapeTeamContact(
  baseUrl: string,
  teamId: string
): Promise<TeamContactInfo> {
  const contactInfo: TeamContactInfo = {
    email: null,
    address: null
  };

  try {
    // Try multiple URL patterns for contact extraction
    const urlPatterns = [
      // Pattern 1: Add contact view parameters to existing URL
      baseUrl.replace(
        /(&LeaguePresenter\.view=teamOverview.*)?$/,
        `&LeaguePresenter.teamListView.view=contact&LeaguePresenter.view=teamOverview&LeaguePresenter.teamListView.teamId=${teamId}`
      ),
      // Pattern 2: Direct contact URL with team ID
      baseUrl.replace(/LeaguePresenter\.view=teamOverview/, `LeaguePresenter.view=contact&LeaguePresenter.teamId=${teamId}`),
      // Pattern 3: Team contact page with specific structure
      baseUrl.replace(/\?.*$/, `?LeaguePresenter.teamId=${teamId}&LeaguePresenter.view=contact`)
    ];

    let contactUrl = urlPatterns[0];
    console.log(`Scraping contact info for team ${teamId} from: ${contactUrl}`);

    let response;
    let attempts = 0;
    
    // Try multiple URL patterns until one works
    for (const url of urlPatterns) {
      attempts++;
      try {
        console.log(`Attempt ${attempts}: Trying URL pattern: ${url}`);
        response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        contactUrl = url;
        break;
      } catch (error) {
        console.log(`URL pattern ${attempts} failed:`, error.message);
        if (attempts === urlPatterns.length) {
          throw error;
        }
      }
    }
    
    if (!response) {
      throw new Error('All URL patterns failed');
    }

    const $ = cheerio.load(response.data);

    // Look for the specific structure in samsCmsComponentBlock
    $('.samsCmsComponentBlock').each((_, block) => {
      const $block = $(block);
      
      // Extract email from mailto links
      const emailLink = $block.find('a[href^="mailto:"]').first();
      if (emailLink.length > 0) {
        const href = emailLink.attr('href') || '';
        const emailMatch = href.match(/mailto:\s*(.+)/);
        if (emailMatch) {
          contactInfo.email = emailMatch[1].trim();
          console.log(`Found email: ${contactInfo.email}`);
        }
      }

      // Extract address from the block content
      const headerText = $block.find('h1.samsCmsComponentBlockHeader').text().trim();
      if (headerText) {
        // Look for address in paragraphs after the header
        const paragraphs = $block.find('p');
        let addressParts: string[] = [];
        
        paragraphs.each((_, p) => {
          const $p = $(p);
          const text = $p.text().trim();
          
          // Skip empty paragraphs and email table content
          if (text && !text.includes('E-Mail:') && !text.includes('mailto:')) {
            // Clean up the text and split by line breaks
            const lines = text.split(/\r?\n|\r|<br\s*\/?>/i)
              .map(line => line.trim())
              .filter(line => line.length > 0);
            
            addressParts.push(...lines);
          }
        });

        if (addressParts.length > 0) {
          contactInfo.address = addressParts.join(', ');
          console.log(`Found address: ${contactInfo.address}`);
        }
      }
    });

  } catch (error) {
    console.error(`Error scraping contact info for team ${teamId}:`, error);
  }

  return contactInfo;
}

interface ScrapedData {
  leagues: InsertLeague[];
  teams: InsertTeam[];
  players: InsertPlayer[];
  matches: InsertMatch[];
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

    // Target specific volleyball website structure for player extraction
    const foundPlayerIds = new Set<string>(); // Track duplicates by teamMemberId
    
    console.log(`Scraping players for team ${teamId} from URL: ${teamUrl}`);
    
    // Method 1: Look for specific datatable structure with ui-widget-content classes
    // First, identify table header structure to map columns correctly
    const headerCells = $('th .ui-column-title');
    const columnMap = new Map<string, number>();
    
    headerCells.each((index, header) => {
      const headerText = $(header).text().trim().toLowerCase();
      if (headerText.includes('spieler') || headerText.includes('player') || headerText.includes('name')) {
        columnMap.set('player', index);
      } else if (headerText.includes('nr.') || headerText.includes('number') || headerText.includes('jersey')) {
        columnMap.set('jersey', index);
      } else if (headerText.includes('position') || headerText.includes('pos')) {
        columnMap.set('position', index);
      } else if (headerText.includes('nat') || headerText.includes('nationality')) {
        columnMap.set('nationality', index);
      } else if (headerText.includes('status')) {
        columnMap.set('status', index);
      }
    });

    $('tr.ui-widget-content.ui-datatable-odd, tr.ui-widget-content.ui-datatable-even, tr[class*="ui-widget-content"][class*="ui-datatable"]').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length > 0) {
        // Look for links with teamMemberId parameter
        const $links = $row.find('a[href*="teamMemberId"]');
        
        $links.each((_, link) => {
          const $link = $(link);
          const href = $link.attr('href') || '';
          const playerName = $link.text().trim();
          
          // Extract teamMemberId from URL
          const memberIdMatch = href.match(/teamMemberId[=:](\d+)/);
          const teamMemberId = memberIdMatch ? memberIdMatch[1] : null;
          
          if (playerName && teamMemberId && isValidPlayerName(playerName) && !foundPlayerIds.has(teamMemberId)) {
            foundPlayerIds.add(teamMemberId);
            
            // Extract data based on column mapping
            let position: string | null = null;
            let jerseyNumber: string | null = null;
            let nationality: string | null = null;
            
            // Use column mapping if available
            if (columnMap.has('jersey') && cells.eq(columnMap.get('jersey')!)) {
              const jerseyText = cells.eq(columnMap.get('jersey')!).text().trim();
              if (/^\d+$/.test(jerseyText) && parseInt(jerseyText) < 100) {
                jerseyNumber = jerseyText;
              }
            }
            
            if (columnMap.has('position') && cells.eq(columnMap.get('position')!)) {
              const posText = cells.eq(columnMap.get('position')!).text().trim();
              if (posText && posText !== '-' && posText !== '') {
                position = posText;
              }
            }
            
            if (columnMap.has('nationality') && cells.eq(columnMap.get('nationality')!)) {
              const natCell = cells.eq(columnMap.get('nationality')!);
              
              // First try to extract from toolTipContent span
              const toolTipContent = natCell.find('span.toolTipContent').text().trim();
              if (toolTipContent) {
                // Extract nationality code from patterns like "Deutschland (GER)" or just "GER"
                const natMatch = toolTipContent.match(/\(([A-Z]{2,3})\)/);
                if (natMatch) {
                  nationality = natMatch[1]; // Extract just the code like "GER"
                } else if (/^[A-Z]{2,3}$/.test(toolTipContent)) {
                  nationality = toolTipContent; // Already a code like "GER"
                } else {
                  nationality = toolTipContent; // Fallback to full text
                }
              } else {
                // Fallback to cell text
                const natText = natCell.text().trim();
                if (natText && natText !== '-' && natText !== '') {
                  nationality = natText;
                }
              }
            }
            
            // Fallback: scan all cells if column mapping didn't work
            if (!jerseyNumber || !nationality) {
              cells.each((_, cell) => {
                const $cell = $(cell);
                const cellText = $cell.text().trim();
                
                // Look for jersey number
                if (!jerseyNumber && /^\d+$/.test(cellText) && parseInt(cellText) < 100) {
                  jerseyNumber = cellText;
                }
                
                // Look for nationality in tooltip content
                if (!nationality) {
                  const toolTipContent = $cell.find('span.toolTipContent').text().trim();
                  if (toolTipContent) {
                    // Extract nationality code from patterns like "Deutschland (GER)" or "Iran, Islamische Republik (IRI)"
                    const natMatch = toolTipContent.match(/\(([A-Z]{2,3})\)/);
                    if (natMatch) {
                      nationality = natMatch[1]; // Extract just the code like "GER" or "IRI"
                    } else if (/^[A-Z]{2,3}$/.test(toolTipContent)) {
                      nationality = toolTipContent; // Already a code like "GER"
                    }
                  }
                  
                  // Also check for standalone nationality codes in cell text
                  if (!nationality && /^[A-Z]{2,3}$/.test(cellText)) {
                    nationality = cellText;
                  }
                }
              });
            }
            
            players.push({
              name: playerName,
              position: position || null, // Keep position separate from nationality
              nationality: nationality || null,
              jerseyNumber: jerseyNumber || null,
              teamId: teamDbId,
              playerId: teamMemberId,
              isActive: true
            });
          }
        });
      }
    });

    console.log(`Found ${players.length} players in datatable structure for team ${teamId}`);

    // Method 2: Look for any links with teamMemberId parameter (broader search)
    if (players.length === 0) {
      $('a[href*="teamMemberId"]').each((_, link) => {
        const $link = $(link);
        const href = $link.attr('href') || '';
        const playerName = $link.text().trim();
        
        // Extract teamMemberId from URL
        const memberIdMatch = href.match(/teamMemberId[=:](\d+)/);
        const teamMemberId = memberIdMatch ? memberIdMatch[1] : null;
        
        if (playerName && teamMemberId && isValidPlayerName(playerName) && !foundPlayerIds.has(teamMemberId)) {
          foundPlayerIds.add(teamMemberId);
          
          // Try to find additional info from parent elements
          const $parent = $link.closest('tr, li, div');
          let position: string | null = null;
          let jerseyNumber: string | null = null;
          let nationality: string | null = null;
          
          $parent.find('*').each((_, element) => {
            const text = $(element).text().trim();
            if (/^\d+$/.test(text) && parseInt(text) < 100) {
              jerseyNumber = text;
            } else if (isValidPosition(text)) {
              position = text;
            }
          });
          
          players.push({
            name: playerName,
            position: position || null,
            nationality: nationality || null,
            jerseyNumber: jerseyNumber || null,
            teamId: teamDbId,
            playerId: teamMemberId,
            isActive: true
          });
        }
      });
      
      console.log(`Found ${players.length} players with teamMemberId links for team ${teamId}`);
    }

    // Method 3: Navigate to team detail page to get player roster
    if (players.length === 0) {
      try {
        // Try to access team roster page directly
        const rosterUrl = baseUrl.replace(
          /(&LeaguePresenter\.view=.*)?$/,
          `&LeaguePresenter.teamListView.view=teamRoster&LeaguePresenter.view=teamOverview&LeaguePresenter.teamListView.teamId=${teamId}`
        );
        
        const rosterResponse = await axios.get(rosterUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        const $roster = cheerio.load(rosterResponse.data);
        
        // Look for player tables in roster page
        $roster('table tr').each((_, row) => {
          const $row = $roster(row);
          const cells = $row.find('td');
          
          if (cells.length >= 2) {
            const playerName = cells.eq(0).text().trim();
            const jerseyNumber = cells.eq(1).text().trim();
            const position = cells.length > 2 ? cells.eq(2).text().trim() : null;
            
            if (isValidPlayerName(playerName)) {
              const playerKey = `${playerName}_${teamDbId}`;
              if (!foundPlayerIds.has(playerKey)) {
                foundPlayerIds.add(playerKey);
                
                players.push({
                  name: playerName,
                  position: isValidPosition(position) ? position : null,
                  nationality: null,
                  jerseyNumber: /^\d+$/.test(jerseyNumber) ? jerseyNumber : null,
                  teamId: teamDbId,
                  playerId: null,
                  isActive: true
                });
              }
            }
          }
        });
        
        console.log(`Found ${players.length} players from roster page for team ${teamId}`);
        
      } catch (error) {
        console.log(`Could not access roster page for team ${teamId}:`, error.message);
      }
    }

    // Method 4: Fallback to general table scanning with improved filtering
    if (players.length === 0) {
      $('table tr').each((_, row) => {
        const $row = $(row);
        const cells = $row.find('td');
        
        if (cells.length >= 1) {
          // Check each cell for potential player names
          cells.each((i, cell) => {
            const cellText = $(cell).text().trim();
            
            if (isValidPlayerName(cellText)) {
              const playerKey = `${cellText}_${teamDbId}`;
              if (!foundPlayerIds.has(playerKey)) {
                foundPlayerIds.add(playerKey);
                
                let jerseyNumber = null;
                let position = null;
                
                // Look for jersey number in adjacent cells
                if (i > 0) {
                  const prevText = cells.eq(i - 1).text().trim();
                  if (/^\d+$/.test(prevText) && parseInt(prevText) < 100) {
                    jerseyNumber = prevText;
                  }
                }
                if (i < cells.length - 1) {
                  const nextText = cells.eq(i + 1).text().trim();
                  if (/^\d+$/.test(nextText) && parseInt(nextText) < 100) {
                    jerseyNumber = nextText;
                  } else if (isValidPosition(nextText)) {
                    position = nextText;
                  }
                }
                
                players.push({
                  name: cellText,
                  position: position || null,
                  nationality: null,
                  jerseyNumber: jerseyNumber || null,
                  teamId: teamDbId,
                  playerId: null,
                  isActive: true
                });
              }
            }
          });
        }
      });
      
      console.log(`Found ${players.length} players from general table scan for team ${teamId}`);
    }

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

async function scrapeMatchResults(
  baseUrl: string,
  seriesId: string,
  leagueDbId: number,
  storageInstance: IStorage
): Promise<InsertMatch[]> {
  const matches: InsertMatch[] = [];
  
  try {
    // Construct matches URL to access match results
    const matchesUrl = baseUrl.replace(
      /(&LeaguePresenter\.view=.*)?$/,
      `&LeaguePresenter.matchSeriesId=${seriesId}&LeaguePresenter.view=matches&playingScheduleMode=full`
    );

    console.log(`Scraping matches from URL: ${matchesUrl}`);

    const response = await axios.get(matchesUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Look for match results in volleyball table structure
    $('tr').each((_, row) => {
      const $row = $(row);
      const resultSpan = $row.find('.samsMatchResultSetPoints');
      
      if (resultSpan.length > 0) {
        const resultText = resultSpan.text().trim();
        const detailedSpan = $row.find('.samsMatchResultBallPoints');
        const detailedText = detailedSpan.text().trim();
        
        // Extract team names from the row structure
        const cells = $row.find('td');
        let homeTeamName = '';
        let awayTeamName = '';
        let dateText = '';
        
        // Enhanced date extraction - look for dates in table headers and data cells
        const $table = $row.closest('table');
        
        // First, check if there's a date column header to identify the column index
        let dateColumnIndex = -1;
        $table.find('th, thead td').each((index, header) => {
          const headerText = $(header).text().trim().toLowerCase();
          if (headerText.includes('datum') || headerText.includes('date') || headerText.includes('termin')) {
            dateColumnIndex = index;
            return false; // Break the loop
          }
        });
        
        // If we found a date column, extract from that specific column
        if (dateColumnIndex >= 0) {
          const dateCell = $row.find('td').eq(dateColumnIndex);
          const cellText = dateCell.text().trim();
          const dateMatch = cellText.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
          if (dateMatch) {
            dateText = cellText;
          }
        } else {
          // Fallback: scan all cells for date patterns
          $row.find('td, th').each((_, cell) => {
            const $cell = $(cell);
            const cellText = $cell.text().trim();
            
            // Look for German date format DD.MM.YYYY or DD.MM.YY
            const dateMatch = cellText.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
            if (dateMatch && !dateText) {
              // Validate it's a reasonable date (not jersey numbers or scores)
              const day = parseInt(dateMatch[1]);
              const month = parseInt(dateMatch[2]);
              if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                dateText = cellText;
                return false; // Break the loop
              }
            }
            
            // Look for other date formats
            const altDateMatch = cellText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
            if (altDateMatch && !dateText) {
              const day = parseInt(altDateMatch[1]);
              const month = parseInt(altDateMatch[2]);
              if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                dateText = `${altDateMatch[1]}.${altDateMatch[2]}.${altDateMatch[3]}`;
                return false; // Break the loop
              }
            }
          });
        }
        
        // Look for teams based on volleyball table structure
        // Usually the team name is in a cell adjacent to the result cell
        const allCells = cells.toArray();
        for (let i = 0; i < allCells.length; i++) {
          const cellText = $(allCells[i]).text().trim();
          
          // Skip cells with scores, empty content, or time
          if (!cellText || cellText.includes(':') || cellText.match(/^\d{1,2}:\d{2}/) || cellText.length < 3) {
            continue;
          }
          
          // Skip result cells
          if ($(allCells[i]).hasClass('samsMatchResultTableCell') || $(allCells[i]).find('.samsMatchResult').length > 0) {
            continue;
          }
          
          // Look for team names in preFormatted spans or plain text
          const teamName = $(allCells[i]).find('.preFormatted').text().trim() || cellText;
          
          if (teamName && teamName.length > 3 && !teamName.includes(':')) {
            if (!homeTeamName) {
              homeTeamName = teamName;
            } else if (!awayTeamName && teamName !== homeTeamName) {
              awayTeamName = teamName;
            }
          }
        }

        // Get detailed set scores if available
        let finalResultText = resultText;
        if (detailedText && detailedText.includes('(') && detailedText.includes(')')) {
          const scoresMatch = detailedText.match(/\(([^)]+)\)/);
          if (scoresMatch) {
            finalResultText = scoresMatch[1].replace(/\s+/g, ', ');
          }
        }

        if (homeTeamName && awayTeamName && resultText && resultText.includes(':')) {
          console.log(`Found volleyball match: ${homeTeamName} vs ${awayTeamName} - ${resultText} (detailed: ${finalResultText})`);
          
          // Look for PDF scoresheet links in the same row
          let pdfUrl: string | null = null;
          const pdfLinks = $row.find('a[href*="scoresheet/pdf"], a[href*=".pdf"]');
          if (pdfLinks.length > 0) {
            const href = pdfLinks.first().attr('href');
            if (href) {
              pdfUrl = href.startsWith('http') ? href : `https://distributor.sams-score.de${href}`;
              console.log(`Found PDF scoresheet: ${pdfUrl}`);
            }
          }
          
          const match = parseMatchResult(homeTeamName, awayTeamName, finalResultText, dateText, seriesId, leagueDbId, pdfUrl);
          if (match) {
            matches.push(match);
          }
        }
      }
    });

    // Look for table rows that contain actual match results
    console.log(`Searching for match results in ${$('.samsMatchResultSetPoints').length} result spans...`);
    
    $('.samsMatchResultSetPoints').each((index, resultElement) => {
      const $resultSpan = $(resultElement);
      const resultText = $resultSpan.text().trim();
      
      if (resultText && resultText.includes(':')) {
        // Get the parent row to find team names
        const $row = $resultSpan.closest('tr');
        const $detailedSpan = $row.find('.samsMatchResultBallPoints');
        const detailedText = $detailedSpan.text().trim();
        
        // Look for team names in the same row
        const teamNames: string[] = [];
        $row.find('td').each((_, cell) => {
          const $cell = $(cell);
          
          // Skip the result cell itself
          if ($cell.hasClass('samsMatchResultTableCell')) {
            return;
          }
          
          // Look for team name in preFormatted span or cell text
          const teamName = $cell.find('.preFormatted').text().trim() || $cell.text().trim();
          
          // Valid team name: not empty, not a score, not a date, reasonable length
          if (teamName && 
              !teamName.includes(':') && 
              !teamName.match(/^\d{1,2}\.\d{1,2}/) && 
              !teamName.match(/^\d{1,2}:\d{2}/) && 
              teamName.length > 3 && 
              teamName.length < 50) {
            teamNames.push(teamName);
          }
        });
        
        if (teamNames.length >= 2) {
          const homeTeam = teamNames[0];
          const awayTeam = teamNames[1];
          
          let finalResult = resultText;
          if (detailedText && detailedText.includes('(')) {
            const scoresMatch = detailedText.match(/\(([^)]+)\)/);
            if (scoresMatch) {
              finalResult = scoresMatch[1].replace(/\s+/g, ', ');
            }
          }
          
          // Look for PDF scoresheet links in the same row
          let pdfUrl: string | null = null;
          const pdfLinks = $row.find('a[href*="scoresheet/pdf"], a[href*=".pdf"]');
          if (pdfLinks.length > 0) {
            const href = pdfLinks.first().attr('href');
            if (href) {
              pdfUrl = href.startsWith('http') ? href : `https://distributor.sams-score.de${href}`;
              console.log(`Found PDF scoresheet: ${pdfUrl}`);
            }
          }
          
          console.log(`Found volleyball match: ${homeTeam} vs ${awayTeam} - ${resultText} (detailed: ${finalResult})`);
          const match = parseMatchResult(homeTeam, awayTeam, finalResult, '', seriesId, leagueDbId, pdfUrl);
          if (match) {
            matches.push(match);
          }
        }
      }
    });

    console.log(`Found ${matches.length} matches for series ${seriesId}`);
    
  } catch (error) {
    console.error(`Error scraping matches from ${baseUrl}:`, error);
  }

  return matches;
}

function parseMatchResult(
  homeTeamName: string,
  awayTeamName: string,
  resultText: string,
  dateText: string,
  seriesId: string,
  leagueDbId: number,
  pdfUrl?: string | null
): InsertMatch | null {
  try {
    // Parse different result formats
    // Format 1: "3:1" (sets won)
    // Format 2: "25:23, 25:20, 20:25, 25:18" (detailed set scores)
    
    let homeSets = 0;
    let awaySets = 0;
    let homePoints = 0;
    let awayPoints = 0;
    let setResults = "";

    if (resultText.includes(',')) {
      // Detailed set scores
      const sets = resultText.split(',').map(s => s.trim());
      setResults = resultText;
      
      sets.forEach(set => {
        const setMatch = set.match(/(\d+):(\d+)/);
        if (setMatch) {
          const homeSetScore = parseInt(setMatch[1]);
          const awaySetScore = parseInt(setMatch[2]);
          
          homePoints += homeSetScore;
          awayPoints += awaySetScore;
          
          if (homeSetScore > awaySetScore) {
            homeSets++;
          } else {
            awaySets++;
          }
        }
      });
    } else {
      // Simple set score like "3:1"
      const setMatch = resultText.match(/(\d+):(\d+)/);
      if (setMatch) {
        homeSets = parseInt(setMatch[1]);
        awaySets = parseInt(setMatch[2]);
        setResults = resultText;
      }
    }

    // Parse date with enhanced format support
    let matchDate: Date | null = null;
    if (dateText) {
      // Handle German date format DD.MM.YYYY or DD.MM.YY
      let dateMatch = dateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1; // Month is 0-indexed
        let year = parseInt(dateMatch[3]);
        
        // Handle 2-digit years
        if (year < 50) {
          year += 2000;
        } else if (year < 100) {
          year += 1900;
        }
        
        matchDate = new Date(year, month, day);
        console.log(`Parsed match date: ${dateText} -> ${matchDate.toISOString()}`);
      } else {
        // Try other date formats
        dateMatch = dateText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (dateMatch) {
          const day = parseInt(dateMatch[1]);
          const month = parseInt(dateMatch[2]) - 1;
          let year = parseInt(dateMatch[3]);
          
          if (year < 50) {
            year += 2000;
          } else if (year < 100) {
            year += 1900;
          }
          
          matchDate = new Date(year, month, day);
          console.log(`Parsed alternative date format: ${dateText} -> ${matchDate.toISOString()}`);
        }
      }
    }

    const homeScore = homeSets > awaySets ? 1 : 0;
    const awayScore = awaySets > homeSets ? 1 : 0;

    return {
      matchId: `${seriesId}_${homeTeamName}_${awayTeamName}`.replace(/[^a-zA-Z0-9_]/g, '_'),
      homeTeamName,
      awayTeamName,
      homeScore,
      awayScore,
      homeSets,
      awaySets,
      setResults,
      matchDate,
      status: 'completed',
      leagueId: leagueDbId,
      seriesId,
      scoresheetPdfUrl: pdfUrl || null,
      homeTeamId: null, // Will be updated when teams are linked
      awayTeamId: null,
      location: null,
      samsUrl: null
    };
  } catch (error) {
    console.error('Error parsing match result:', error);
    return null;
  }
}

// Helper function to get team ID by name
async function getTeamIdByName(teamName: string, storageInstance: IStorage): Promise<number | null> {
  try {
    const teams = await storageInstance.getTeams();
    const team = teams.find(t => t.name === teamName);
    return team?.id || null;
  } catch (error) {
    console.error(`Error finding team by name "${teamName}":`, error);
    return null;
  }
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
    matches: [],
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

    // Extract match results FIRST if we're on a matches view page
    if (url.includes('view=matches') && seriesId) {
      console.log(`Extracting match results directly from matches page...`);
      
      // Look for match results in the current page HTML
      $('tr').each((_, row) => {
        const $row = $(row);
        const resultSpan = $row.find('.samsMatchResultSetPoints');
        
        if (resultSpan.length > 0) {
          const resultText = resultSpan.text().trim();
          
          if (resultText && resultText.includes(':')) {
            const detailedSpan = $row.find('.samsMatchResultBallPoints');
            const detailedText = detailedSpan.text().trim();
            
            // Extract team names from the same row
            const teamNames: string[] = [];
            $row.find('td').each((_, cell) => {
              const $cell = $(cell);
              
              // Skip the result cell itself
              if ($cell.hasClass('samsMatchResultTableCell')) {
                return;
              }
              
              // Look for team name in preFormatted span or cell text
              const teamName = $cell.find('.preFormatted').text().trim() || $cell.text().trim();
              
              // Valid team name: not empty, not a score, not a date, reasonable length
              if (teamName && 
                  !teamName.includes(':') && 
                  !teamName.match(/^\d{1,2}\.\d{1,2}/) && 
                  !teamName.match(/^\d{1,2}:\d{2}/) && 
                  teamName.length > 3 && 
                  teamName.length < 50) {
                teamNames.push(teamName);
              }
            });
            
            if (teamNames.length >= 2) {
              const homeTeam = teamNames[0];
              const awayTeam = teamNames[teamNames.length - 1];
              
              let finalResult = resultText;
              if (detailedText && detailedText.includes('(')) {
                const scoresMatch = detailedText.match(/\(([^)]+)\)/);
                if (scoresMatch) {
                  finalResult = scoresMatch[1].replace(/\s+/g, ', ');
                }
              }
              
              console.log(`Found volleyball match: ${homeTeam} vs ${awayTeam} - ${resultText} (detailed: ${finalResult})`);
              const match = parseMatchResult(homeTeam, awayTeam, finalResult, '', seriesId, league.id);
              
              if (match) {
                scrapedData.matches.push(match);
              }
            }
          }
        }
      });
      
      console.log(`Found ${scrapedData.matches.length} matches on page`);
    }

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
            contactEmail: null,
            contactAddress: null,
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
              contactEmail: null,
              contactAddress: null,
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
                  homepage: null,
                  logoUrl: null,
                  contactEmail: null,
                  contactAddress: null,
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
      try {
        // Extract contact information for each team
        console.log(`Extracting contact info for team: ${teamData.name} (ID: ${teamData.teamId})`);
        const contactInfo = await scrapeTeamContact(url, teamData.teamId);
        
        // Add contact information to team data
        const teamDataWithContact = {
          ...teamData,
          contactEmail: contactInfo.email,
          contactAddress: contactInfo.address
        };

        const existingTeam = existingTeams.find(t => t.teamId === teamData.teamId);
        
        if (existingTeam) {
          await storageInstance.updateTeam(existingTeam.id, teamDataWithContact);
          teamDatabaseIds.push({ teamId: teamData.teamId, dbId: existingTeam.id });
          updatedCount++;
        } else {
          const newTeam = await storageInstance.createTeam(teamDataWithContact);
          teamDatabaseIds.push({ teamId: teamData.teamId, dbId: newTeam.id });
          createdCount++;
        }

        // Add delay between contact extraction requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Failed to extract contact info for team ${teamData.teamId}:`, error);
        // Continue with team creation/update without contact info
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

    // Scrape match results if we have a series ID
    if (seriesId) {
      console.log(`Scraping match results for series ${seriesId}...`);
      
      // Try different match view URLs to ensure we get all matches
      const matchUrls = [
        url.replace(/LeaguePresenter\.view=[^&]*/, 'LeaguePresenter.view=matches'),
        url.includes('view=matches') ? url : `${url}&LeaguePresenter.view=matches&playingScheduleMode=full`,
        `${url.split('?')[0]}?LeaguePresenter.matchSeriesId=${seriesId}&LeaguePresenter.view=matches&playingScheduleMode=full`
      ];
      
      let allMatches: InsertMatch[] = [];
      for (const matchUrl of matchUrls) {
        try {
          const matches = await scrapeMatchResults(matchUrl, seriesId, league.id, storageInstance);
          // Avoid duplicates by checking if match already exists
          for (const match of matches) {
            const exists = allMatches.find(m => 
              m.homeTeamName === match.homeTeamName && 
              m.awayTeamName === match.awayTeamName &&
              m.homeSets === match.homeSets &&
              m.awaySets === match.awaySets
            );
            if (!exists) {
              allMatches.push(match);
            }
          }
        } catch (error) {
          console.log(`Failed to scrape from ${matchUrl}, trying next URL...`);
        }
      }
      
      scrapedData.matches.push(...allMatches);
      console.log(`Found ${allMatches.length} matches for series ${seriesId}`);
    }

    // Store extracted matches in database and update team statistics
    let matchCount = 0;
    if (scrapedData.matches.length > 0) {
      console.log(`Storing ${scrapedData.matches.length} extracted matches...`);
      
      for (const matchData of scrapedData.matches) {
        try {
          // Try to link team IDs based on team names
          const homeTeam = teamDatabaseIds.find(t => {
            const storedTeam = teams.find(team => team.teamId === t.teamId);
            return storedTeam && (
              storedTeam.name.toLowerCase().includes(matchData.homeTeamName.toLowerCase()) ||
              matchData.homeTeamName.toLowerCase().includes(storedTeam.name.toLowerCase())
            );
          });
          
          const awayTeam = teamDatabaseIds.find(t => {
            const storedTeam = teams.find(team => team.teamId === t.teamId);
            return storedTeam && (
              storedTeam.name.toLowerCase().includes(matchData.awayTeamName.toLowerCase()) ||
              matchData.awayTeamName.toLowerCase().includes(storedTeam.name.toLowerCase())
            );
          });
          
          if (homeTeam) matchData.homeTeamId = homeTeam.dbId;
          if (awayTeam) matchData.awayTeamId = awayTeam.dbId;
          
          const createdMatch = await storageInstance.createMatch(matchData);
          matchCount++;
          
          // Process PDF scoresheet if URL is available
          if (matchData.scoresheetPdfUrl && createdMatch.id) {
            console.log(`Processing PDF for match ${createdMatch.id}: ${matchData.scoresheetPdfUrl}`);
            try {
              const { pdfParser } = await import('./pdf-parser');
              const pdfData = await pdfParser.parsePDFFromUrl(matchData.scoresheetPdfUrl);
              
              if (pdfData && pdfData.sets.length > 0) {
                // Store match sets data
                for (const setData of pdfData.sets) {
                  setData.matchId = createdMatch.id;
                  await storageInstance.createMatchSet(setData);
                }
                
                // Skip lineup processing to prevent foreign key constraint violations
                // Lineups would need proper team ID mapping which isn't available at this stage
                console.log(`Skipping lineup processing for match ${createdMatch.id} to prevent database errors`);
                
                console.log(`Successfully extracted ${pdfData.sets.length} sets and ${pdfData.lineups.length} lineups from PDF`);
              } else {
                console.log(`No detailed data extracted from PDF for match ${createdMatch.id}`);
              }
            } catch (error) {
              console.error(`Failed to process PDF for match ${createdMatch.id}:`, error);
            }
          }
          
          // Update team statistics
          if (homeTeam && awayTeam) {
            await updateTeamStats(homeTeam.dbId, awayTeam.dbId, matchData, league.id, storageInstance);
          }
        } catch (error) {
          console.error(`Failed to store match: ${matchData.homeTeamName} vs ${matchData.awayTeamName}`, error);
        }
      }
      
      console.log(`Successfully stored ${matchCount} matches`);
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

async function updateTeamStats(
  homeTeamId: number,
  awayTeamId: number,
  matchData: InsertMatch,
  leagueId: number,
  storageInstance: IStorage
): Promise<void> {
  try {
    // Calculate points from set results
    let homePoints = 0;
    let awayPoints = 0;
    
    if (matchData.setResults && matchData.setResults.includes(',')) {
      // Parse detailed set scores like "25:23, 25:20, 20:25, 25:18"
      const sets = matchData.setResults.split(',').map(s => s.trim());
      sets.forEach(set => {
        const setMatch = set.match(/(\d+):(\d+)/);
        if (setMatch) {
          homePoints += parseInt(setMatch[1]);
          awayPoints += parseInt(setMatch[2]);
        }
      });
    }

    // Update home team stats
    const homeWon = (matchData.homeSets || 0) > (matchData.awaySets || 0) ? 1 : 0;
    const homeLost = homeWon ? 0 : 1;

    await storageInstance.updateOrCreateTeamStats(homeTeamId, leagueId, {
      matchesPlayed: 1,
      matchesWon: homeWon,
      matchesLost: homeLost,
      setsWon: matchData.homeSets || 0,
      setsLost: matchData.awaySets || 0,
      pointsFor: homePoints,
      pointsAgainst: awayPoints,
    });

    // Update away team stats
    const awayWon = homeLost;
    const awayLost = homeWon;

    await storageInstance.updateOrCreateTeamStats(awayTeamId, leagueId, {
      matchesPlayed: 1,
      matchesWon: awayWon,
      matchesLost: awayLost,
      setsWon: matchData.awaySets || 0,
      setsLost: matchData.homeSets || 0,
      pointsFor: awayPoints,
      pointsAgainst: homePoints,
    });

  } catch (error) {
    console.error(`Failed to update team stats for match ${homeTeamId} vs ${awayTeamId}:`, error);
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
