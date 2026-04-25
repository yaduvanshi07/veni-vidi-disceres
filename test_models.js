const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const modelsToTest = [
  'gemini-pro',
  'gemini-1.0-pro',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'models/gemini-pro',
  'models/gemini-1.0-pro',
];

async function testModel(modelName) {
  try {
    console.log(`Testing model: ${modelName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Say "Hello"');
    const response = await result.response;
    const text = response.text();
    console.log(`✅ ${modelName} WORKS! Response: ${text.substring(0, 50)}...`);
    return { modelName, works: true };
  } catch (error) {
    console.log(`❌ ${modelName} failed: ${error.message.split('\n')[0]}`);
    return { modelName, works: false, error: error.message };
  }
}

async function testAllModels() {
  console.log('Testing available Gemini models...\n');
  const results = [];
  
  for (const modelName of modelsToTest) {
    const result = await testModel(modelName);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
  }
  
  console.log('\n=== RESULTS ===');
  const workingModels = results.filter(r => r.works);
  
  if (workingModels.length > 0) {
    console.log('\n✅ Working models:');
    workingModels.forEach(r => console.log(`   - ${r.modelName}`));
    console.log(`\nRecommended: Use "${workingModels[0].modelName}" in your .env file`);
  } else {
    console.log('\n❌ No working models found. Please check:');
    console.log('   1. Your GEMINI_API_KEY is correct');
    console.log('   2. Your API key has access to Gemini models');
    console.log('   3. Your API key is not expired');
  }
}

testAllModels().catch(console.error);

