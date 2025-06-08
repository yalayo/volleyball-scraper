const axios = require('axios');
const pdfParse = require('pdf-parse');

async function testPDFParsing() {
  try {
    console.log('Testing PDF parsing directly...');
    
    const pdfUrl = 'https://distributor.sams-score.de/scoresheet/pdf/6218889d-76f7-4f43-b0ee-cfbb52dafa6b/54';
    
    const response = await axios.get(pdfUrl, { 
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const pdfBuffer = Buffer.from(response.data);
    console.log(`PDF buffer size: ${pdfBuffer.length} bytes`);
    
    // Test direct parsing without options
    const pdfData = await pdfParse(pdfBuffer);
    
    if (pdfData && pdfData.text) {
      console.log(`Successfully extracted ${pdfData.text.length} characters`);
      console.log('First 500 characters:', pdfData.text.substring(0, 500));
      
      // Test team extraction
      const lines = pdfData.text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      let homeTeam = 'Unknown';
      let awayTeam = 'Unknown';
      
      for (const line of lines) {
        if (line.match(/^A\s+(.+)/)) {
          const match = line.match(/^A\s+(.+)/);
          if (match) {
            homeTeam = match[1].replace(/\.\.\.$/, '').trim();
          }
        }
        if (line.includes('Werdener TB')) {
          awayTeam = 'Werdener TB';
        }
      }
      
      console.log('\nExtracted teams:');
      console.log('Home:', homeTeam);
      console.log('Away:', awayTeam);
      
      return true;
    } else {
      console.log('No text extracted');
      return false;
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

testPDFParsing();