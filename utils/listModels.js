const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listAvailableModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    
    // Try to list models (if the SDK supports it)
    console.log('Attempting to list available models...');
    console.log('Note: This feature may not be available in all SDK versions.');
    
    // Common model names to try
    const modelsToTry = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
      'gemini-pro-vision',
      'models/gemini-pro',
      'models/gemini-1.5-pro',
      'models/gemini-1.5-flash'
    ];
    
    console.log('\nTry these model names:');
    modelsToTry.forEach(model => console.log(`  - ${model}`));
    
    return modelsToTry;
  } catch (error) {
    console.error('Error listing models:', error);
    return [];
  }
}

if (require.main === module) {
  listAvailableModels();
}

module.exports = { listAvailableModels };

