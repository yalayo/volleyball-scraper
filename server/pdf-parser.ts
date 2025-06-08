// Temporarily disabled due to import issues
// import pdfParse from 'pdf-parse';
import axios from 'axios';
import type { InsertMatchSet, InsertMatchLineup } from '@shared/schema';

export interface ParsedPDFData {
  sets: InsertMatchSet[];
  lineups: InsertMatchLineup[];
  homeTeamName: string;
  awayTeamName: string;
  matchDate?: Date;
}

export interface PointEvent {
  point: number;
  team: 'home' | 'away';
  action: 'attack' | 'serve' | 'block' | 'error' | 'timeout';
  player?: string;
  score: {
    home: number;
    away: number;
  };
}

export interface LineupPosition {
  position: number;
  player: string;
  number?: string;
}

export class VolleyballPDFParser {
  
  async parsePDFFromUrl(pdfUrl: string): Promise<ParsedPDFData | null> {
    try {
      console.log(`Downloading PDF from: ${pdfUrl}`);
      
      // Download PDF
      const response = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Failed to download PDF: HTTP ${response.status}`);
      }

      // Parse PDF content
      const pdfData = await pdfParse(Buffer.from(response.data));
      const text = pdfData.text;

      console.log(`PDF parsed successfully, text length: ${text.length}`);
      
      // Extract match information
      return this.extractMatchData(text);
      
    } catch (error) {
      console.error(`Error parsing PDF from ${pdfUrl}:`, error);
      return null;
    }
  }

  private extractMatchData(text: string): ParsedPDFData {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Extract team names
    const { homeTeamName, awayTeamName } = this.extractTeamNames(lines);
    
    // Extract set results and point sequences
    const sets = this.extractSets(lines);
    
    // Extract lineups for each set
    const lineups = this.extractLineups(lines, homeTeamName, awayTeamName);
    
    // Extract match date
    const matchDate = this.extractMatchDate(lines);

    return {
      sets,
      lineups,
      homeTeamName,
      awayTeamName,
      matchDate
    };
  }

  private extractTeamNames(lines: string[]): { homeTeamName: string; awayTeamName: string } {
    let homeTeamName = 'Unknown Home Team';
    let awayTeamName = 'Unknown Away Team';

    // Look for team names in common volleyball scoresheet patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Pattern: "Team A vs Team B" or "Team A - Team B"
      const vsMatch = line.match(/^(.+?)\s+(?:vs|gegen|-)\s+(.+?)$/i);
      if (vsMatch) {
        homeTeamName = vsMatch[1].trim();
        awayTeamName = vsMatch[2].trim();
        break;
      }
      
      // Pattern: Look for "Heim:" and "Gast:" (German)
      if (line.toLowerCase().includes('heim:') || line.toLowerCase().includes('home:')) {
        const teamMatch = line.match(/(?:heim|home):\s*(.+)/i);
        if (teamMatch) {
          homeTeamName = teamMatch[1].trim();
        }
      }
      
      if (line.toLowerCase().includes('gast:') || line.toLowerCase().includes('away:')) {
        const teamMatch = line.match(/(?:gast|away):\s*(.+)/i);
        if (teamMatch) {
          awayTeamName = teamMatch[1].trim();
        }
      }
    }

    return { homeTeamName, awayTeamName };
  }

  private extractSets(lines: string[]): InsertMatchSet[] {
    const sets: InsertMatchSet[] = [];
    let currentSet = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for set results - pattern like "25:23" or "Set 1: 25-23"
      const setScoreMatch = line.match(/(?:set\s*\d+[:\s]+)?(\d{1,2})[:\-\s]+(\d{1,2})/i);
      
      if (setScoreMatch && currentSet <= 5) {
        const homeScore = parseInt(setScoreMatch[1]);
        const awayScore = parseInt(setScoreMatch[2]);
        
        // Validate volleyball scores (typically 15-30 range)
        if (homeScore >= 15 && awayScore >= 15 && 
            (homeScore >= 25 || awayScore >= 25) &&
            Math.abs(homeScore - awayScore) >= 2) {
          
          // Extract point sequence for this set
          const pointSequence = this.extractPointSequence(lines, i, currentSet);
          
          sets.push({
            matchId: 0, // Will be set by the caller
            setNumber: currentSet,
            homeScore,
            awayScore,
            pointSequence: JSON.stringify(pointSequence),
            duration: this.extractSetDuration(lines, i)
          });
          
          currentSet++;
        }
      }
    }

    return sets;
  }

  private extractPointSequence(lines: string[], setStartIndex: number, setNumber: number): PointEvent[] {
    const pointEvents: PointEvent[] = [];
    
    // Look for point-by-point tracking in the PDF
    // This is often in a table format showing each point scored
    for (let i = setStartIndex; i < Math.min(setStartIndex + 50, lines.length); i++) {
      const line = lines[i];
      
      // Pattern for point tracking: "1-0", "1-1", "2-1", etc.
      const pointMatch = line.match(/(\d{1,2})-(\d{1,2})/);
      
      if (pointMatch) {
        const homePoints = parseInt(pointMatch[1]);
        const awayPoints = parseInt(pointMatch[2]);
        
        // Determine which team scored based on previous score
        const lastEvent = pointEvents[pointEvents.length - 1];
        let scoringTeam: 'home' | 'away' = 'home';
        
        if (lastEvent) {
          if (homePoints > lastEvent.score.home) {
            scoringTeam = 'home';
          } else if (awayPoints > lastEvent.score.away) {
            scoringTeam = 'away';
          }
        }
        
        pointEvents.push({
          point: pointEvents.length + 1,
          team: scoringTeam,
          action: 'attack', // Default action, could be refined with more parsing
          score: {
            home: homePoints,
            away: awayPoints
          }
        });
      }
    }
    
    return pointEvents;
  }

  private extractLineups(lines: string[], homeTeamName: string, awayTeamName: string): InsertMatchLineup[] {
    const lineups: InsertMatchLineup[] = [];
    
    // Look for lineup information in the PDF
    for (let setNum = 1; setNum <= 5; setNum++) {
      // Find sections that contain lineup information for each set
      const homeLineup = this.extractTeamLineup(lines, homeTeamName, setNum, 'home');
      const awayLineup = this.extractTeamLineup(lines, awayTeamName, setNum, 'away');
      
      if (homeLineup) {
        lineups.push({
          matchId: 0, // Will be set by the caller
          teamId: 0, // Will be resolved by the caller
          setNumber: setNum,
          ...homeLineup
        });
      }
      
      if (awayLineup) {
        lineups.push({
          matchId: 0, // Will be set by the caller
          teamId: 0, // Will be resolved by the caller
          setNumber: setNum,
          ...awayLineup
        });
      }
    }
    
    return lineups;
  }

  private extractTeamLineup(lines: string[], teamName: string, setNumber: number, teamType: 'home' | 'away') {
    // Look for lineup sections in the PDF
    // Common patterns: "Starting Lineup", "Aufstellung", player positions 1-6
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      // Look for lineup section indicators
      if (line.includes('aufstellung') || line.includes('lineup') || line.includes('starting')) {
        // Check if this section is for the correct team
        const teamContext = lines.slice(Math.max(0, i - 3), i + 10).join(' ').toLowerCase();
        
        if (teamContext.includes(teamName.toLowerCase())) {
          // Extract player positions
          const positions = this.extractPlayerPositions(lines.slice(i, i + 15));
          
          if (positions.length >= 6) {
            return {
              position1: positions[0] || null,
              position2: positions[1] || null,
              position3: positions[2] || null,
              position4: positions[3] || null,
              position5: positions[4] || null,
              position6: positions[5] || null,
              libero: positions.find(p => p.includes('L') || p.includes('Libero')) || null,
              substitutes: JSON.stringify([])
            };
          }
        }
      }
    }
    
    return null;
  }

  private extractPlayerPositions(lines: string[]): string[] {
    const positions: string[] = [];
    
    for (const line of lines) {
      // Look for player entries with numbers and names
      // Pattern: "12 Müller" or "5 Schmidt, A."
      const playerMatch = line.match(/(\d{1,2})\s+([A-Za-zäöüÄÖÜß,.\s]+)/);
      
      if (playerMatch && positions.length < 7) {
        const number = playerMatch[1];
        const name = playerMatch[2].trim();
        positions.push(`${number} ${name}`);
      }
    }
    
    return positions;
  }

  private extractSetDuration(lines: string[], setIndex: number): number | null {
    // Look for duration information near the set score
    for (let i = Math.max(0, setIndex - 5); i < Math.min(setIndex + 5, lines.length); i++) {
      const line = lines[i];
      
      // Pattern for duration: "25:30" (25 minutes 30 seconds) or "45 min"
      const durationMatch = line.match(/(\d{1,2}):(\d{2})|(\d{1,3})\s*min/i);
      
      if (durationMatch) {
        if (durationMatch[1] && durationMatch[2]) {
          // Format MM:SS
          return parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]);
        } else if (durationMatch[3]) {
          // Format: X min
          return parseInt(durationMatch[3]) * 60;
        }
      }
    }
    
    return null;
  }

  private extractMatchDate(lines: string[]): Date | undefined {
    for (const line of lines) {
      // Look for German date format DD.MM.YYYY
      const dateMatch = line.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
      
      if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1; // JavaScript months are 0-indexed
        let year = parseInt(dateMatch[3]);
        
        // Handle 2-digit years
        if (year < 50) {
          year += 2000;
        } else if (year < 100) {
          year += 1900;
        }
        
        const date = new Date(year, month, day);
        
        // Validate the date is reasonable (within volleyball season range)
        if (date > new Date('2020-01-01') && date < new Date('2030-12-31')) {
          return date;
        }
      }
    }
    
    return undefined;
  }
}

export const pdfParser = new VolleyballPDFParser();