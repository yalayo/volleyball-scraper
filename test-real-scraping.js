import { scrapeVolleyballData } from './server/scraper.js';
import { storage } from './server/storage.js';

// Test the complete scraping functionality with contact extraction
async function testRealScraping() {
  try {
    console.log('Starting comprehensive scraping test with contact extraction...');
    
    // Use a real volleyball league URL for testing
    const testUrl = 'https://www.volleyball-verband.de/cms/index.php?Spielbetrieb.do&LeaguePresenter.matchSeriesId=70061247&LeaguePresenter.view=teamOverview';
    
    console.log('Test URL:', testUrl);
    console.log('Starting scraping process...');
    
    // Run the complete scraping process
    await scrapeVolleyballData(testUrl, 'Test League', 'Test Category', storage);
    
    console.log('✅ Scraping completed successfully');
    
    // Check if teams were created with contact information
    const teams = await storage.getTeams();
    console.log('\n=== Teams with Contact Information ===');
    
    teams.forEach(team => {
      if (team.contactEmail || team.contactAddress) {
        console.log(`Team: ${team.name}`);
        console.log(`  Email: ${team.contactEmail || 'Not found'}`);
        console.log(`  Address: ${team.contactAddress || 'Not found'}`);
        console.log('  ---');
      }
    });
    
    const teamsWithContact = teams.filter(t => t.contactEmail || t.contactAddress);
    console.log(`\nFound ${teamsWithContact.length} teams with contact information out of ${teams.length} total teams`);
    
  } catch (error) {
    console.error('Error in scraping test:', error);
  }
}

// Run the test
testRealScraping().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});