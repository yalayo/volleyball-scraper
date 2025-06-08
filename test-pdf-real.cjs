const axios = require('axios');
const pdfParse = require('pdf-parse');

async function testRealPDFExtraction() {
  try {
    console.log('Testing real PDF extraction from SAMS volleyball scoresheet...');
    
    const pdfUrl = 'https://distributor.sams-score.de/scoresheet/pdf/6218889d-76f7-4f43-b0ee-cfbb52dafa6b/54';
    
    const response = await axios.get(pdfUrl, { 
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const pdfBuffer = Buffer.from(response.data);
    console.log(`Downloaded PDF buffer: ${pdfBuffer.length} bytes`);
    
    const pdfData = await pdfParse(pdfBuffer);
    
    if (pdfData && pdfData.text) {
      console.log(`\n=== EXTRACTED PDF TEXT (${pdfData.text.length} characters) ===`);
      console.log(pdfData.text.substring(0, 2000));
      console.log('\n=== END PDF TEXT ===\n');
      
      // Look for volleyball-specific patterns
      const lines = pdfData.text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      console.log('Analyzing volleyball data patterns...');
      console.log(`Total lines: ${lines.length}`);
      
      // Look for team names
      const teamPatterns = [];
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes('mannschaft') || 
            line.toLowerCase().includes('team') ||
            line.toLowerCase().includes('verein')) {
          teamPatterns.push(`Line ${index}: ${line}`);
        }
      });
      
      console.log('\nTeam-related lines:');
      teamPatterns.slice(0, 10).forEach(pattern => console.log(pattern));
      
      // Look for player names and numbers
      const playerPatterns = [];
      lines.forEach((line, index) => {
        const playerMatch = line.match(/(\d{1,2})\s+([A-Za-zäöüÄÖÜß,.\s]{3,})/);
        if (playerMatch && line.length < 50) {
          playerPatterns.push(`Line ${index}: ${line}`);
        }
      });
      
      console.log('\nPlayer-related lines:');
      playerPatterns.slice(0, 20).forEach(pattern => console.log(pattern));
      
      // Look for scores
      const scorePatterns = [];
      lines.forEach((line, index) => {
        const scoreMatch = line.match(/(\d{1,2})[:\-\s]+(\d{1,2})/);
        if (scoreMatch && parseInt(scoreMatch[1]) >= 15 && parseInt(scoreMatch[2]) >= 15) {
          scorePatterns.push(`Line ${index}: ${line}`);
        }
      });
      
      console.log('\nScore-related lines:');
      scorePatterns.slice(0, 10).forEach(pattern => console.log(pattern));
      
    } else {
      console.log('No text extracted from PDF');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testRealPDFExtraction();