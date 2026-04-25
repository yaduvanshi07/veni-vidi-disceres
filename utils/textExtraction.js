const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');

async function extractTextFromDocument(filePath, fileType) {
  try {
    let extractedText = '';

    switch (fileType) {
      case 'pdf':
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        extractedText = pdfData.text;
        
        // If PDF text extraction returns empty or minimal text, try OCR
        if (!extractedText || extractedText.trim().length < 50) {
          console.log('PDF text extraction minimal, trying OCR...');
          const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
          extractedText = text;
        }
        break;

      case 'image':
        const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
        extractedText = text;
        break;

      case 'docx':
        const docxBuffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer: docxBuffer });
        extractedText = result.value;
        break;

      default:
        throw new Error('Unsupported file type');
    }

    return extractedText.trim();
  } catch (error) {
    console.error('Text extraction error:', error);
    throw error;
  }
}

module.exports = { extractTextFromDocument };

