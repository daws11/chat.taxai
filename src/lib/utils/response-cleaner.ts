/**
 * Utility functions to clean AI responses from references and citations
 */

/**
 * Removes all types of citations and references from AI responses
 * @param content - The content to clean
 * @returns Cleaned content without references
 */
export function cleanReferences(content: string): string {
  if (!content) return content;

  return content
    // Remove citation patterns like 【5:19†source】
    .replace(/【\d+:?\d*†source】/g, '')
    // Remove numbered citations like [1], [2], etc.
    .replace(/\[\d+\]/g, '')
    // Remove source references
    .replace(/\[source\]/gi, '')
    .replace(/\[Source\]/g, '')
    .replace(/\[SOURCE\]/g, '')
    // Remove "according to" phrases
    .replace(/according to [^.]*\./gi, '')
    .replace(/as stated in [^.]*\./gi, '')
    .replace(/based on [^.]*\./gi, '')
    .replace(/as mentioned in [^.]*\./gi, '')
    .replace(/as per [^.]*\./gi, '')
    .replace(/per the document[^.]*\./gi, '')
    .replace(/per the file[^.]*\./gi, '')
    // Remove document references
    .replace(/in the document[^.]*\./gi, '')
    .replace(/from the file[^.]*\./gi, '')
    .replace(/in the uploaded [^.]*\./gi, '')
    .replace(/in the attached [^.]*\./gi, '')
    .replace(/from the attached [^.]*\./gi, '')
    // Remove specific reference patterns
    .replace(/\(see [^)]*\)/gi, '')
    .replace(/\(ref: [^)]*\)/gi, '')
    .replace(/\(reference: [^)]*\)/gi, '')
    .replace(/\(source: [^)]*\)/gi, '')
    // Remove URL references
    .replace(/\(https?:\/\/[^)]*\)/gi, '')
    // Clean up extra spaces and punctuation while preserving line breaks
    .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space
    .replace(/\n[ \t]+/g, '\n') // Remove spaces at start of lines
    .replace(/[ \t]+\n/g, '\n') // Remove spaces at end of lines
    .replace(/\n{3,}/g, '\n\n') // Replace 3+ line breaks with 2
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .replace(/\s+;/g, ';')
    .replace(/\s+:/g, ':')
    .replace(/\s+\)/g, ')')
    .replace(/\(\s+/g, '(')
    .trim();
}

/**
 * Checks if content contains references that should be filtered out
 * @param content - The content to check
 * @returns True if content should be filtered out
 */
export function shouldFilterContent(content: string): boolean {
  if (!content) return true;
  
  const lower = content.toLowerCase();
  
  // Filter out checking messages
  const checkingPhrases = [
    'let me check the uploaded files',
    'please hold on',
    'let me verify your query',
    'i will check the uploaded files',
    'i will check uploaded files',
    'i will check the files',
    'i will check files',
    'i will check the document',
    'i will check document',
    'i will check your document',
    'i will check your file',
    'i will check your files',
    'i will check for relevant information',
    'according to the document',
    'as stated in the file',
    'based on the uploaded',
    'as mentioned in the document',
    'per the document',
    'per the file'
  ];
  
  // Check for checking phrases
  for (const phrase of checkingPhrases) {
    if (lower.includes(phrase)) {
      return true;
    }
  }
  
  // Check for combination phrases
  if (lower.includes('to assist you with your inquiry') && lower.includes('let me check')) {
    return true;
  }
  
  return false;
}

/**
 * Comprehensive response cleaning function
 * @param content - The content to clean
 * @returns Cleaned content or null if should be filtered
 */
export function cleanAIResponse(content: string): string | null {
  if (!content) return null;
  
  // First check if content should be filtered out
  if (shouldFilterContent(content)) {
    return null;
  }
  
  // Clean references
  const cleaned = cleanReferences(content);
  
  // Return null if content becomes empty after cleaning
  if (!cleaned.trim()) {
    return null;
  }
  
  return cleaned;
}
