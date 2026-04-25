const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try to use the listModels method if available
    console.log('Attempting to list available models...\n');
    
    // Make a direct API call to list models
    const fetch = require('node-fetch');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    if (data.models) {
      console.log('✅ Available models:');
      data.models.forEach(model => {
        console.log(`   - ${model.name}`);
        if (model.supportedGenerationMethods) {
          console.log(`     Methods: ${model.supportedGenerationMethods.join(', ')}`);
        }
      });
      
      // Find models that support generateContent
      const generateContentModels = data.models.filter(m => 
        m.supportedGenerationMethods?.includes('generateContent')
      );
      
      if (generateContentModels.length > 0) {
        console.log('\n✅ Models that support generateContent:');
        generateContentModels.forEach(model => {
          const shortName = model.name.replace('models/', '');
          console.log(`   - ${shortName}`);
        });
        
        const recommended = generateContentModels[0].name.replace('models/', '');
        console.log(`\n💡 Recommended model: ${recommended}`);
        console.log(`   Add this to your .env: GEMINI_MODEL_NAME=${recommended}`);
      }
    } else {
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nTrying alternative method...');
    
    // Alternative: Try common model names
    const commonModels = [
      'gemini-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-1.0-pro',
      'gemini-pro-vision'
    ];
    
    console.log('\nTry these model names manually:');
    commonModels.forEach(m => console.log(`   - ${m}`));
  }
}

listModels();

