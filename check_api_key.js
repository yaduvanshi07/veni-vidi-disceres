const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function checkAPIKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  console.log('=== API Key Check ===\n');
  console.log(`API Key present: ${apiKey ? 'Yes' : 'No'}`);
  console.log(`API Key length: ${apiKey ? apiKey.length : 0}`);
  console.log(`API Key starts with: ${apiKey ? apiKey.substring(0, 10) + '...' : 'N/A'}`);
  
  if (!apiKey) {
    console.log('\n❌ ERROR: GEMINI_API_KEY is not set in .env file');
    return;
  }
  
  if (apiKey === 'your-gemini-api-key-here' || apiKey.includes('your-')) {
    console.log('\n❌ ERROR: API key appears to be a placeholder');
    console.log('Please get your actual API key from: https://makersuite.google.com/app/apikey');
    return;
  }
  
  console.log('\n=== Testing API Connection ===');
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try to list models (this might not work in all SDK versions)
    console.log('Attempting to connect to Gemini API...');
    
    // Try a simple model call with error details
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      await model.generateContent('test');
    } catch (error) {
      console.log('\nError details:');
      console.log(`Status: ${error.status || 'N/A'}`);
      console.log(`Message: ${error.message}`);
      
      if (error.message.includes('API key')) {
        console.log('\n❌ API Key issue detected!');
        console.log('Please verify your API key is correct at: https://makersuite.google.com/app/apikey');
      } else if (error.message.includes('404')) {
        console.log('\n❌ Model not found - this might be a regional/access issue');
        console.log('Possible solutions:');
        console.log('1. Check if your API key has access to Gemini models');
        console.log('2. Try creating a new API key');
        console.log('3. Check if Gemini is available in your region');
      }
    }
    
  } catch (error) {
    console.log('\n❌ Failed to initialize Gemini AI:', error.message);
  }
}

checkAPIKey();

