// File: src/markdown.js

import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Takes a plain text string with markdown-like syntax,
 * parses it into HTML, and then sanitizes it to prevent XSS attacks.
 * @param {string} text - The raw text from the AI or user.
 * @returns {string} - A string of safe, sanitized HTML.
 */
export function parseAndSanitize(text) {
  if (!text || typeof text !== 'string') {
    return ''; // Return an empty string if the input is invalid
  }

  // 1. Parse the Markdown into raw HTML.
  // The 'gfm: true' enables GitHub-flavored markdown for better list support.
  // The 'breaks: true' option turns newlines (\n) into <br> tags.
  const rawHtml = marked.parse(text, { gfm: true, breaks: true });

  // 2. Sanitize the raw HTML to remove any dangerous tags or attributes.
  const sanitizedHtml = DOMPurify.sanitize(rawHtml);

  return sanitizedHtml;
}