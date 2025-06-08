import axios from 'axios';
import * as cheerio from 'cheerio';

// Test the contact extraction functionality
async function testContactExtraction() {
  try {
    // Test with a specific team ID from the Werdener TB team
    const baseUrl = 'https://www.volleyball-verband.de/cms/index.php';
    const teamId = '27050'; // Example team ID
    
    // Construct contact URL
    const contactUrl = `${baseUrl}?LeaguePresenter.teamListView.view=contact&LeaguePresenter.teamListView.teamId=${teamId}`;
    
    console.log('Testing contact extraction for team ID:', teamId);
    console.log('Contact URL:', contactUrl);
    
    // Make request to contact page
    const response = await axios.get(contactUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    console.log('\n=== Contact Page Content ===');
    console.log('Page title:', $('title').text());
    
    // Look for email addresses
    const emails = [];
    $('a[href^="mailto:"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        const email = href.replace('mailto:', '');
        emails.push(email);
      }
    });
    
    // Look for address information
    const addressDivs = [];
    $('div').each((_, element) => {
      const text = $(element).text().trim();
      if (text && (text.includes('Straße') || text.includes('str.') || text.includes('Platz') || 
                   text.includes('Weg') || text.includes('Gasse') || text.match(/\d{5}\s+\w+/))) {
        // Check if it's not too long (likely to be an address)
        if (text.length < 200 && text.length > 10) {
          addressDivs.push(text);
        }
      }
    });
    
    console.log('\n=== Extracted Information ===');
    console.log('Emails found:', emails);
    console.log('Potential addresses found:', addressDivs);
    
    // Test the actual extraction function
    const extractedEmail = emails.length > 0 ? emails[0] : null;
    const extractedAddress = addressDivs.length > 0 ? addressDivs[0] : null;
    
    console.log('\n=== Final Extraction Results ===');
    console.log('Email:', extractedEmail);
    console.log('Address:', extractedAddress);
    
    return {
      email: extractedEmail,
      address: extractedAddress
    };
    
  } catch (error) {
    console.error('Error testing contact extraction:', error.message);
    return null;
  }
}

// Run the test
testContactExtraction().then(result => {
  if (result) {
    console.log('\n✅ Contact extraction test completed successfully');
  } else {
    console.log('\n❌ Contact extraction test failed');
  }
});