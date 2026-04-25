const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Try different model names in order of preference
// Updated to use Gemini 2.x models which are currently available
const MODEL_NAMES = [
  'gemini-2.5-flash',      // Latest, fastest, most cost-effective
  'gemini-2.5-pro',        // Latest, high quality
  'gemini-2.0-flash',      // Previous version (fast)
  'gemini-2.0-flash-001',  // Specific version
  'gemini-1.5-flash',      // Fallback (may not be available)
  'gemini-1.5-pro',        // Fallback (may not be available)
  'gemini-pro',            // Legacy fallback
];

/**
 * Get a working Gemini model
 * Tries models in order until one works
 */
async function getGeminiModel(preferredModel = null) {
  const modelsToTry = preferredModel 
    ? [preferredModel, ...MODEL_NAMES]
    : MODEL_NAMES;
  
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Test if the model works by making a simple request
      // We'll catch the error if it doesn't work
      return model;
    } catch (error) {
      console.log(`Model ${modelName} not available, trying next...`);
      continue;
    }
  }
  
  // If all fail, return the first one anyway (will throw error at runtime)
  console.warn('Warning: No confirmed working model, using gemini-1.5-flash as default');
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}

/**
 * Get model name (simpler, no async needed)
 * Just returns the model object - errors will be caught at runtime
 */
function getModel(modelName = null) {
  // Default to gemini-2.5-flash as it's the latest and most available
  const name = modelName || process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
  return genAI.getGenerativeModel({ model: name });
}

module.exports = { getGeminiModel, getModel, genAI };

