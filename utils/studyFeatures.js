const Flashcard = require('../models/Flashcard');
const Summary = require('../models/Summary');
const Document = require('../models/Document');
const { getModel } = require('./getGeminiModel');

// Generate flashcards from document
async function generateFlashcards(userId, documentId, text) {
  try {
    const model = getModel();
    
    const prompt = `Generate flashcards from the following document text. For each flashcard, provide:
1. A question or concept on the front
2. A detailed answer or explanation on the back

Format the response as a JSON array with this structure:
[
  {
    "front": "Question or concept",
    "back": "Answer or explanation",
    "topic": "Topic name",
    "difficulty": "Easy|Medium|Hard"
  }
]

Generate 10-15 flashcards covering key concepts. Document text:

${text.substring(0, 8000)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not parse flashcards from response');
    }
    
    const flashcardsData = JSON.parse(jsonMatch[0]);
    
    // Save flashcards
    const flashcards = [];
    for (const cardData of flashcardsData) {
      const flashcard = new Flashcard({
        userId,
        documentId,
        front: cardData.front,
        back: cardData.back,
        topic: cardData.topic || 'General',
        difficulty: cardData.difficulty || 'Medium',
        nextReview: new Date()
      });
      await flashcard.save();
      flashcards.push(flashcard);
    }
    
    return flashcards;
  } catch (error) {
    console.error('Error generating flashcards:', error);
    throw error;
  }
}

// Generate summary
async function generateSummary(userId, documentId, text) {
  try {
    const model = getModel();
    
    const prompt = `Create a comprehensive summary of the following document. Include:
1. Key concepts (as a list)
2. Main summary (paragraph form)
3. Important points (bullet list)
4. Formulas if any (with LaTeX notation)
5. Diagrams mentioned (if any)

Format as JSON:
{
  "keyConcepts": ["concept1", "concept2"],
  "summary": "Main summary text",
  "importantPoints": ["point1", "point2"],
  "formulas": [
    {
      "name": "Formula name",
      "formula": "Formula text",
      "latex": "LaTeX notation"
    }
  ],
  "diagrams": [
    {
      "description": "Diagram description",
      "explanation": "Explanation"
    }
  ]
}

Document text:

${text.substring(0, 8000)}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse summary from response');
    }
    
    const summaryData = JSON.parse(jsonMatch[0]);
    
    // Check if summary exists
    let summary = await Summary.findOne({ userId, documentId });
    
    if (summary) {
      summary.keyConcepts = summaryData.keyConcepts || [];
      summary.summary = summaryData.summary || '';
      summary.importantPoints = summaryData.importantPoints || [];
      summary.formulas = summaryData.formulas || [];
      summary.diagrams = summaryData.diagrams || [];
      summary.updatedAt = new Date();
    } else {
      summary = new Summary({
        userId,
        documentId,
        ...summaryData
      });
    }
    
    await summary.save();
    return summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}

// Find related documents
async function findRelatedDocuments(documentId, userId, limit = 5) {
  try {
    const document = await Document.findById(documentId);
    if (!document) return [];
    
    // Find documents with similar topics or subject
    const related = await Document.find({
      userId,
      _id: { $ne: documentId },
      $or: [
        { subject: document.subject },
        { topics: { $in: document.topics || [] } },
        { courseId: document.courseId }
      ]
    })
    .limit(limit)
    .sort({ uploadDate: -1 });
    
    return related;
  } catch (error) {
    console.error('Error finding related documents:', error);
    return [];
  }
}

// Update flashcard mastery
async function updateFlashcardMastery(flashcardId, isCorrect) {
  try {
    const flashcard = await Flashcard.findById(flashcardId);
    if (!flashcard) return;
    
    // Update mastery based on correctness
    if (isCorrect) {
      flashcard.mastery = Math.min(100, flashcard.mastery + 10);
    } else {
      flashcard.mastery = Math.max(0, flashcard.mastery - 5);
    }
    
    flashcard.reviewCount += 1;
    flashcard.lastReviewed = new Date();
    
    // Calculate next review date (spaced repetition)
    const daysUntilNextReview = Math.max(1, Math.floor(100 / (flashcard.mastery + 1)));
    flashcard.nextReview = new Date();
    flashcard.nextReview.setDate(flashcard.nextReview.getDate() + daysUntilNextReview);
    
    await flashcard.save();
    return flashcard;
  } catch (error) {
    console.error('Error updating flashcard mastery:', error);
    throw error;
  }
}

module.exports = {
  generateFlashcards,
  generateSummary,
  findRelatedDocuments,
  updateFlashcardMastery
};

