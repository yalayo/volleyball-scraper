// Test PDF extraction functionality
import { pdfParser } from './server/pdf-parser.js';

async function testPdfExtraction() {
  console.log('Testing PDF extraction with sample volleyball scoresheet...');
  
  // Use one of the actual PDF URLs from the scraped matches
  const testPdfUrl = 'https://distributor.sams-score.de/scoresheet/pdf/2b8e9d9d-8e62-4dbb-bbe4-44061436ba06/56';
  
  try {
    const result = await pdfParser.parsePDFFromUrl(testPdfUrl);
    
    if (result) {
      console.log('✓ PDF extraction successful!');
      console.log(`- Home team: ${result.homeTeamName}`);
      console.log(`- Away team: ${result.awayTeamName}`);
      console.log(`- Sets extracted: ${result.sets.length}`);
      console.log(`- Lineups extracted: ${result.lineups.length}`);
      
      if (result.sets.length > 0) {
        console.log('\nSet details:');
        result.sets.forEach(set => {
          console.log(`  Set ${set.setNumber}: ${set.homeScore}-${set.awayScore} (${set.duration}min)`);
        });
      }
    } else {
      console.log('❌ No data extracted from PDF');
    }
    
  } catch (error) {
    console.error('❌ PDF extraction failed:', error.message);
  }
}

testPdfExtraction();