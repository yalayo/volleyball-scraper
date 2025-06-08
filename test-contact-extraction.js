import { scrapeTeamContact } from './server/scraper.js';

// Test contact extraction with real team data
async function testContactExtraction() {
  try {
    console.log('Testing contact extraction with real team data...');
    
    // Test with a known team ID from the database
    const teamId = '70108584'; // Kevelaerer SV II
    const baseUrl = 'https://ergebnisdienst.volleyball.nrw/cms/home/erwachsene/landesligen/landesligen_maenner/landesliga_3_maenner.xhtml?LeaguePresenter.view=teamOverview&LeaguePresenter.matchSeriesId=70108659';
    console.log(`Testing contact extraction for team ID: ${teamId}`);
    
    const contactInfo = await scrapeTeamContact(baseUrl, teamId);
    
    console.log('\n=== Contact Extraction Results ===');
    console.log(`Team ID: ${teamId}`);
    console.log(`Email: ${contactInfo.email || 'Not found'}`);
    console.log(`Address: ${contactInfo.address || 'Not found'}`);
    
    if (contactInfo.email || contactInfo.address) {
      console.log('✅ Contact extraction successful');
    } else {
      console.log('⚠️ No contact information found');
    }
    
    // Test with another team ID
    const teamId2 = '70108582'; // Another team from the database
    console.log(`\nTesting contact extraction for team ID: ${teamId2}`);
    
    const contactInfo2 = await scrapeTeamContact(baseUrl, teamId2);
    
    console.log('\n=== Contact Extraction Results 2 ===');
    console.log(`Team ID: ${teamId2}`);
    console.log(`Email: ${contactInfo2.email || 'Not found'}`);
    console.log(`Address: ${contactInfo2.address || 'Not found'}`);
    
    if (contactInfo2.email || contactInfo2.address) {
      console.log('✅ Contact extraction successful');
    } else {
      console.log('⚠️ No contact information found');
    }
    
  } catch (error) {
    console.error('Error in contact extraction test:', error);
  }
}

// Run the test
testContactExtraction().then(() => {
  console.log('Contact extraction test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});