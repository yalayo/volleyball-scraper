const axios = require('axios');
const pdfParse = require('pdf-parse');

// Import the PDF parser logic (simplified version for testing)
class TestVolleyballPDFParser {
  async testExtraction() {
    try {
      console.log('Testing authentic PDF extraction from SAMS volleyball scoresheet...');
      
      const pdfUrl = 'https://distributor.sams-score.de/scoresheet/pdf/6218889d-76f7-4f43-b0ee-cfbb52dafa6b/54';
      
      const response = await axios.get(pdfUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const pdfBuffer = Buffer.from(response.data);
      const pdfData = await pdfParse(pdfBuffer);
      
      if (pdfData && pdfData.text) {
        const lines = pdfData.text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        // Test team name extraction
        const teams = this.extractTeamNames(lines);
        console.log('\n=== TEAM EXTRACTION TEST ===');
        console.log('Home Team:', teams.homeTeamName);
        console.log('Away Team:', teams.awayTeamName);
        
        // Test player extraction
        const players = this.extractPlayers(lines);
        console.log('\n=== PLAYER EXTRACTION TEST ===');
        console.log('Extracted Players:');
        players.forEach((player, index) => {
          console.log(`${index + 1}. ${player}`);
        });
        
        // Test set scores extraction
        const sets = this.extractSets(lines);
        console.log('\n=== SET SCORES EXTRACTION TEST ===');
        sets.forEach((set, index) => {
          console.log(`Set ${set.setNumber}: ${set.homeScore}-${set.awayScore}`);
        });
        
        // Test match date extraction
        const matchDate = this.extractMatchDate(lines);
        console.log('\n=== MATCH DATE EXTRACTION TEST ===');
        console.log('Match Date:', matchDate ? matchDate.toLocaleDateString() : 'Not found');
        
      }
      
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
  
  extractTeamNames(lines) {
    let homeTeamName = 'Unknown Home Team';
    let awayTeamName = 'Unknown Away Team';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // SAMS pattern: "A TuB Bocholt..." and "B Werdener TB"
      if (line.match(/^A\s+(.+)/)) {
        const teamMatch = line.match(/^A\s+(.+)/);
        if (teamMatch) {
          homeTeamName = teamMatch[1].replace(/\.\.\.$/, '').trim();
        }
      }
      
      if (line.match(/^B\s+(.+)/)) {
        const teamMatch = line.match(/^B\s+(.+)/);
        if (teamMatch) {
          awayTeamName = teamMatch[1].trim();
        }
      }
    }

    return { homeTeamName, awayTeamName };
  }
  
  extractPlayers(lines) {
    const players = [];
    
    for (const line of lines) {
      // SAMS pattern: "15Vahlbrock, MarlonX" or "16Janitzki, NicoX"
      const samsPlayerMatch = line.match(/(\d{1,2})([A-Za-zäöüÄÖÜß,.\s]+?)X$/);
      
      if (samsPlayerMatch && players.length < 20) {
        const number = samsPlayerMatch[1];
        const name = samsPlayerMatch[2].trim();
        players.push(`#${number} - ${name}`);
      }
    }
    
    return players;
  }
  
  extractSets(lines) {
    const sets = [];
    let currentSet = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // SAMS pattern: Look for final scores in format "25 6" or "20 25"
      if (line.includes('Punkte') && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const scoreMatch = nextLine.match(/^(\d{1,2})\s+(\d{1,2})$/);
        
        if (scoreMatch && currentSet <= 5) {
          const score1 = parseInt(scoreMatch[1]);
          const score2 = parseInt(scoreMatch[2]);
          
          // Validate volleyball scores
          if ((score1 >= 15 || score2 >= 15) && (score1 >= 25 || score2 >= 25 || (score1 >= 15 && score2 >= 15))) {
            sets.push({
              setNumber: currentSet,
              homeScore: score1,
              awayScore: score2
            });
            currentSet++;
          }
        }
      }
    }

    return sets;
  }
  
  extractMatchDate(lines) {
    for (const line of lines) {
      // Look for German date format DD.MM.YYYY
      const dateMatch = line.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
      
      if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1;
        let year = parseInt(dateMatch[3]);
        
        if (year < 50) {
          year += 2000;
        } else if (year < 100) {
          year += 1900;
        }
        
        const date = new Date(year, month, day);
        
        if (date > new Date('2020-01-01') && date < new Date('2030-12-31')) {
          return date;
        }
      }
    }
    
    return undefined;
  }
}

const parser = new TestVolleyballPDFParser();
parser.testExtraction();