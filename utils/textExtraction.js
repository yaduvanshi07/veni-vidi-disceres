const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const MAX_TEXT_LENGTH = 500_000; // ~500K chars — avoid storing huge blobs in MongoDB

/**
 * Extract plain text from a document file.
 * @param {string} filePath - Absolute path to the file
 * @param {string} fileType - One of: 'pdf' | 'image' | 'docx'
 * @returns {Promise<string>} Extracted text (trimmed, capped at MAX_TEXT_LENGTH)
 */
async function extractTextFromDocument(filePath, fileType) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  let extractedText = '';

  try {
    switch (fileType) {
      case 'pdf': {
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        extractedText = data.text || '';

        // If the PDF has no selectable text (scanned), fall back to OCR
        if (extractedText.trim().length < 50) {
          console.log('[TEXT] PDF text minimal, attempting OCR fallback…');
          const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
            logger: () => {} // Suppress verbose Tesseract logs in production
          });
          extractedText = text || '';
        }
        break;
      }

      case 'image': {
        const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
          logger: () => {}
        });
        extractedText = text || '';
        break;
      }

      case 'docx': {
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || '';
        break;
      }

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error(`[TEXT] Extraction failed for ${path.basename(filePath)}:`, error.message);
    throw error;
  }

  const trimmed = extractedText.trim();
  if (trimmed.length > MAX_TEXT_LENGTH) {
    console.warn(`[TEXT] Extracted text truncated from ${trimmed.length} to ${MAX_TEXT_LENGTH} chars`);
    return trimmed.slice(0, MAX_TEXT_LENGTH);
  }
  return trimmed;
}

module.exports = { extractTextFromDocument };
