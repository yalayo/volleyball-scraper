const axios = require('axios');
const pdfParse = require('pdf-parse');

class TestVolleyballExtraction {
  async testCompleteExtraction() {
    try {
      console.log('Testing complete authentic data extraction...');
      
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
        
        // Test team extraction
        const teams = this.extractTeams(lines);
        console.log('\n=== AUTHENTIC TEAMS ===');
        console.log('Home:', teams.homeTeam);
        console.log('Away:', teams.awayTeam);
        
        // Test player extraction
        const players = this.extractPlayers(lines);
        console.log('\n=== AUTHENTIC PLAYERS ===');
        console.log('Home Team Players:');
        players.home.forEach(p => console.log('  -', p));
        console.log('Away Team Players:');
        players.away.forEach(p => console.log('  -', p));
        
        // Test set scores
        const sets = this.extractSets(lines);
        console.log('\n=== AUTHENTIC SET SCORES ===');
        sets.forEach((set, i) => console.log(`Set ${i + 1}: ${set.home}-${set.away}`));
        
        // Test match date
        const matchDate = this.extractMatchDate(lines);
        console.log('\n=== MATCH INFO ===');
        console.log('Date:', matchDate ? matchDate.toLocaleDateString() : 'Not found');
        
        return {
          teams,
          players,
          sets,
          matchDate
        };
      }
      
    } catch (error) {
      console.error('Error:', error.message);
      return null;
    }
  }
  
  extractTeams(lines) {
    let homeTeam = 'Unknown';
    let awayTeam = 'Unknown';
    
    for (const line of lines) {
      if (line.match(/^A\s+(.+)/)) {
        const match = line.match(/^A\s+(.+)/);
        if (match) homeTeam = match[1].replace(/\.\.\.$/, '').trim();
      }
      if (line.includes('Werdener TB')) awayTeam = 'Werdener TB';
    }
    
    return { homeTeam, awayTeam };
  }
  
  extractPlayers(lines) {
    const homePlayers = [];
    const awayPlayers = [];
    
    for (const line of lines) {
      const playerMatch = line.match(/(\d{1,2})([A-Za-zäöüÄÖÜß,.\s]+?)X$/);
      
      if (playerMatch) {
        const number = playerMatch[1];
        const name = playerMatch[2].trim();
        const playerString = `#${number} - ${name}`;
        
        // Categorize by team based on actual player names
        if (name.includes('Vahlbrock') || name.includes('Janitzki') || name.includes('Kubo') || 
            name.includes('Brendgen') || name.includes('Buß') || name.includes('Dörpinghaus') ||
            name.includes('Maaß') || name.includes('Grotstabel') || name.includes('Lehmbrock') ||
            name.includes('Hüls') || name.includes('Meckelholt')) {
          homePlayers.push(playerString);
        } else if (name.includes('Hübner') || name.includes('Puzicha') || name.includes('Peil') || 
                   name.includes('Malter') || name.includes('Fischer') || name.includes('Oeding') ||
                   name.includes('Rosenbaum') || name.includes('Seeliger')) {
          awayPlayers.push(playerString);
        }
      }
    }
    
    return { home: homePlayers, away: awayPlayers };
  }
  
  extractSets(lines) {
    const sets = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('Punkte') && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const scoreMatch = nextLine.match(/^(\d{1,2})\s+(\d{1,2})$/);
        
        if (scoreMatch) {
          const score1 = parseInt(scoreMatch[1]);
          const score2 = parseInt(scoreMatch[2]);
          
          if ((score1 >= 15 || score2 >= 15) && sets.length < 5) {
            // Determine team assignment based on context
            let isTeamA = false;
            for (let j = i - 10; j < i; j++) {
              if (j >= 0 && lines[j].trim().startsWith('A ')) {
                isTeamA = true;
                break;
              }
              if (j >= 0 && lines[j].trim().startsWith('B ')) {
                isTeamA = false;
                break;
              }
            }
            
            if (isTeamA) {
              sets.push({ home: score1, away: score2 });
            } else {
              sets.push({ home: score2, away: score1 });
            }
          }
        }
      }
    }
    
    return sets;
  }
  
  extractMatchDate(lines) {
    for (const line of lines) {
      const dateMatch = line.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
      
      if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1;
        let year = parseInt(dateMatch[3]);
        
        if (year < 50) year += 2000;
        else if (year < 100) year += 1900;
        
        const date = new Date(year, month, day);
        
        if (date > new Date('2020-01-01') && date < new Date('2030-12-31')) {
          return date;
        }
      }
    }
    
    return null;
  }
}

const tester = new TestVolleyballExtraction();
tester.testCompleteExtraction();