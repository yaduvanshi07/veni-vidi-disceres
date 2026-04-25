const Document = require('../models/Document');
const { getModel } = require('./getGeminiModel');

// Multi-document comparison
async function compareDocuments(userId, documentIds, question) {
  try {
    const documents = await Document.find({
      _id: { $in: documentIds },
      userId
    });
    
    if (documents.length < 2) {
      throw new Error('Need at least 2 documents to compare');
    }
    
    const model = getModel();
    
    let contextText = 'Compare the following documents:\n\n';
    documents.forEach((doc, index) => {
      contextText += `Document ${index + 1} (${doc.originalName}):\n${doc.extractedText.substring(0, 3000)}\n\n`;
    });
    
    const prompt = `${contextText}\n\nUser Question: ${question}\n\nProvide a detailed comparison answering the question.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error comparing documents:', error);
    throw error;
  }
}

// Pattern recognition - find topics that appear most
async function recognizePatterns(userId, documentIds) {
  try {
    const documents = await Document.find({
      _id: { $in: documentIds },
      userId,
      isParsed: true
    });
    
    if (documents.length === 0) {
      throw new Error('No documents found');
    }
    
    const model = getModel();
    
    let contextText = 'Analyze the following documents and identify:\n';
    contextText += '1. Most frequently appearing topics\n';
    contextText += '2. Common themes\n';
    contextText += '3. Key concepts\n';
    contextText += '4. Patterns and relationships\n\n';
    
    documents.forEach((doc, index) => {
      contextText += `Document ${index + 1}: ${doc.originalName}\n${doc.extractedText.substring(0, 2000)}\n\n`;
    });
    
    const prompt = contextText + '\nProvide a structured analysis with topics, themes, and patterns.';
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error recognizing patterns:', error);
    throw error;
  }
}

// Find solved examples
async function findSolvedExamples(userId, documentIds, topic) {
  try {
    const documents = await Document.find({
      _id: { $in: documentIds },
      userId,
      isParsed: true
    });
    
    const model = getModel();
    
    let contextText = `Find solved examples related to "${topic}" in the following documents:\n\n`;
    documents.forEach((doc) => {
      contextText += `${doc.originalName}:\n${doc.extractedText.substring(0, 3000)}\n\n`;
    });
    
    const prompt = contextText + `\nExtract and list all solved examples, step-by-step solutions, or worked problems related to "${topic}". Format them clearly.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error finding solved examples:', error);
    throw error;
  }
}

// Extract formulas and render LaTeX
async function extractFormulas(userId, documentIds) {
  try {
    const documents = await Document.find({
      _id: { $in: documentIds },
      userId,
      isParsed: true
    });
    
    const model = getModel();
    
    let contextText = 'Extract all mathematical formulas, equations, and expressions from the following documents.\n';
    contextText += 'For each formula, provide:\n';
    contextText += '1. Formula name/description\n';
    contextText += '2. Formula in plain text\n';
    contextText += '3. LaTeX notation\n\n';
    
    documents.forEach((doc) => {
      contextText += `${doc.originalName}:\n${doc.extractedText.substring(0, 3000)}\n\n`;
    });
    
    const prompt = contextText + '\nFormat as JSON array with structure: [{"name": "...", "formula": "...", "latex": "..."}]';
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    
    // Extract JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return [];
  } catch (error) {
    console.error('Error extracting formulas:', error);
    return [];
  }
}

// Explain diagrams and graphs
async function explainDiagrams(userId, documentIds) {
  try {
    const documents = await Document.find({
      _id: { $in: documentIds },
      userId,
      isParsed: true
    });
    
    const model = getModel();
    
    let contextText = 'Identify and explain all diagrams, graphs, charts, and visual representations mentioned in the following documents:\n\n';
    documents.forEach((doc) => {
      contextText += `${doc.originalName}:\n${doc.extractedText.substring(0, 3000)}\n\n`;
    });
    
    const prompt = contextText + '\nFor each diagram/graph, provide:\n1. Description\n2. What it represents\n3. Key elements\n4. How to interpret it';
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error explaining diagrams:', error);
    throw error;
  }
}

// Enhanced chatbot with advanced capabilities
async function enhancedChat(userId, message, documentIds = [], context = {}) {
  try {
    const model = getModel();
    
    // Detect advanced queries
    const comparePattern = /compare|difference|similar|vs|versus/i;
    const patternPattern = /pattern|topic|theme|common|frequent/i;
    const examplePattern = /example|solution|solve|worked|problem/i;
    const formulaPattern = /formula|equation|math|latex/i;
    const diagramPattern = /diagram|graph|chart|figure|visual/i;
    
    let response = '';
    let enhancedFeatures = [];
    
    // Handle multi-document comparison
    if (comparePattern.test(message) && documentIds.length >= 2) {
      response = await compareDocuments(userId, documentIds, message);
      enhancedFeatures.push('multi-document-comparison');
    }
    // Handle pattern recognition
    else if (patternPattern.test(message) && documentIds.length > 0) {
      response = await recognizePatterns(userId, documentIds);
      enhancedFeatures.push('pattern-recognition');
    }
    // Handle solved examples
    else if (examplePattern.test(message) && documentIds.length > 0) {
      const topic = message.match(/(?:about|on|for|regarding)\s+([^?]+)/i)?.[1] || '';
      response = await findSolvedExamples(userId, documentIds, topic);
      enhancedFeatures.push('solved-examples');
    }
    // Handle formula extraction
    else if (formulaPattern.test(message) && documentIds.length > 0) {
      const formulas = await extractFormulas(userId, documentIds);
      response = `Found ${formulas.length} formulas:\n\n`;
      formulas.forEach((formula, index) => {
        response += `${index + 1}. ${formula.name}\n`;
        response += `   Formula: ${formula.formula}\n`;
        response += `   LaTeX: ${formula.latex}\n\n`;
      });
      enhancedFeatures.push('formula-extraction');
    }
    // Handle diagram explanation
    else if (diagramPattern.test(message) && documentIds.length > 0) {
      response = await explainDiagrams(userId, documentIds);
      enhancedFeatures.push('diagram-explanation');
    }
    // Standard chat
    else {
      const documents = await Document.find({
        _id: { $in: documentIds },
        userId
      });
      
      let contextPrompt = '';
      if (documents.length > 0) {
        contextPrompt = 'Document Context:\n';
        documents.forEach(doc => {
          contextPrompt += `${doc.originalName}:\n${doc.extractedText.substring(0, 2000)}\n\n`;
        });
      }
      
      const prompt = `${contextPrompt}\nUser Question: ${message}\n\nAnswer based on the document context above.`;
      
      const result = await model.generateContent(prompt);
      const responseObj = await result.response;
      response = responseObj.text();
    }
    
    return {
      response,
      enhancedFeatures
    };
  } catch (error) {
    console.error('Error in enhanced chat:', error);
    throw error;
  }
}

module.exports = {
  compareDocuments,
  recognizePatterns,
  findSolvedExamples,
  extractFormulas,
  explainDiagrams,
  enhancedChat
};

