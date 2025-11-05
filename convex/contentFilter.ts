/**
 * Content Filtering Module
 * 
 * Provides profanity filtering and content validation for user-generated content.
 * Uses the bad-words library for robust profanity detection.
 * 
 * The bad-words library automatically handles word-boundary matching, so legitimate
 * words like "class", "assignment", "pool", "button" etc. are not flagged even if
 * they contain letter sequences that might appear in profane words.
 */

import { Filter } from 'bad-words';

// Initialize the profanity filter with default word list
// The filter only flags complete profane words, not substrings
const filter = new Filter();

/**
 * Check if text contains profanity
 * @param text - The text to check
 * @returns true if profanity is detected, false otherwise
 */
function containsProfanity(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  return filter.isProfane(text);
}

/**
 * Clean text by censoring profanity
 * @param text - The text to clean
 * @returns The text with profanity censored
 */
function cleanText(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  return filter.clean(text);
}

/**
 * Validate a username
 * Checks for profanity and ensures it meets basic requirements
 */
export function validateUsername(username: string | undefined | null): string {
  if (!username || typeof username !== 'string') {
    throw new Error('Username is required');
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length === 0) {
    throw new Error('Username cannot be empty');
  }
  
  if (trimmed.length > 50) {
    throw new Error('Username is too long (max 50 characters)');
  }
  
  if (containsProfanity(trimmed)) {
    throw new Error('Username contains inappropriate content');
  }
  
  return trimmed;
}

/**
 * Validate company/product name
 * Checks for profanity and ensures it meets basic requirements
 */
export function validateName(name: string | undefined | null, type: string = 'Name'): string {
  if (!name || typeof name !== 'string') {
    throw new Error(`${type} is required`);
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    throw new Error(`${type} cannot be empty`);
  }
  
  if (trimmed.length > 100) {
    throw new Error(`${type} is too long (max 100 characters)`);
  }
  
  if (containsProfanity(trimmed)) {
    throw new Error(`${type} contains inappropriate content`);
  }
  
  return trimmed;
}

/**
 * Validate description
 * Checks for profanity and ensures it meets basic requirements
 */
export function validateDescription(
  description: string | undefined | null,
  fieldName: string = 'Description'
): string | undefined {
  if (!description || typeof description !== 'string') {
    return undefined;
  }
  
  const trimmed = description.trim();
  
  if (trimmed.length === 0) {
    return undefined;
  }
  
  if (trimmed.length > 1000) {
    throw new Error(`${fieldName} is too long (max 1000 characters)`);
  }
  
  if (containsProfanity(trimmed)) {
    throw new Error(`${fieldName} contains inappropriate content`);
  }
  
  return trimmed;
}

/**
 * Validate ticker symbol
 * Checks for profanity and ensures it meets ticker requirements
 */
export function validateTicker(ticker: string | undefined | null): string | undefined {
  if (!ticker || typeof ticker !== 'string') {
    return undefined;
  }
  
  const trimmed = ticker.trim().toUpperCase();
  
  if (trimmed.length === 0) {
    return undefined;
  }
  
  if (trimmed.length > 6) {
    throw new Error('Ticker symbol is too long (max 6 characters)');
  }
  
  if (!/^[A-Z]+$/.test(trimmed)) {
    throw new Error('Ticker symbol must contain only letters');
  }
  
  if (containsProfanity(trimmed)) {
    throw new Error('Ticker symbol contains inappropriate content');
  }
  
  return trimmed;
}

/**
 * Validate tags array
 * Checks each tag for profanity and ensures they meet requirements
 */
export function validateTags(tags: string[] | undefined | null): string[] | undefined {
  if (!tags || !Array.isArray(tags)) {
    return undefined;
  }
  
  const validatedTags: string[] = [];
  
  for (const tag of tags) {
    if (typeof tag !== 'string') {
      continue;
    }
    
    const trimmed = tag.trim().toLowerCase();
    
    if (trimmed.length === 0) {
      continue;
    }
    
    if (trimmed.length > 30) {
      throw new Error('Tag is too long (max 30 characters)');
    }
    
    if (containsProfanity(trimmed)) {
      throw new Error(`Tag "${trimmed}" contains inappropriate content`);
    }
    
    validatedTags.push(trimmed);
  }
  
  return validatedTags.length > 0 ? validatedTags : undefined;
}
