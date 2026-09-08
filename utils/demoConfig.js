'use strict';

// Single source of truth for the demo token limit
const DEMO_TOKEN_LIMIT = 2026;

// Designated public demo document ID (can be overridden via environment variable)
const DEMO_DOCUMENT_ID = process.env.DEMO_DOCUMENT_ID || '69ecb9876b6ad38099eafb1a';

/**
 * Checks whether a document or document ID corresponds to the designated public demo document.
 * @param {Object|string} doc - Document instance or document ID string
 * @returns {boolean}
 */
function isPublicDemoDoc(doc) {
  if (!doc) return false;
  if (typeof doc === 'string') {
    return doc === DEMO_DOCUMENT_ID;
  }
  const idStr = doc._id ? doc._id.toString() : '';
  return Boolean(doc.isPublicDemo || idStr === DEMO_DOCUMENT_ID);
}

module.exports = {
  DEMO_TOKEN_LIMIT,
  DEMO_DOCUMENT_ID,
  isPublicDemoDoc
};
