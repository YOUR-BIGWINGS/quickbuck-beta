# Content Filtering and Duplicate Email Fix

## Overview
This document describes the implementation of advanced content filtering and the fix for the duplicate email signup bug.

## Changes Implemented

### 1. Duplicate Email Bug Fix

**Problem:** Users could sign up multiple times with the same email address, creating multiple player accounts and exploiting the loan system.

**Solution:**
- Added email index to users schema (`convex/schema.ts`)
- Updated `upsertUser` in `convex/users.ts` to check for existing emails before creating new users
- Updated `getOrCreatePlayer` in `convex/players.ts` to prevent multiple player accounts per email
- Error messages inform users when email already exists

**Files Modified:**
- `convex/schema.ts` - Added `by_email` index
- `convex/users.ts` - Added email validation in `upsertUser`
- `convex/players.ts` - Added email checks in `getOrCreatePlayer`

### 2. Advanced Content Filtering System

**Implementation:**
Created comprehensive content filtering system using the `bad-words` library combined with custom patterns.

#### New File: `convex/contentFilter.ts`

**Features:**
1. **Profanity Detection** - Uses bad-words library for base filtering
2. **L33t Speak Detection** - Catches intentional misspellings (e.g., "sh!t", "f*ck")
3. **Hate Speech Prevention** - Detects slurs and discriminatory language
4. **Sexual Content Filtering** - Blocks inappropriate sexual content
5. **Violence/Threat Detection** - Identifies violent or threatening language
6. **Spam Prevention** - Detects spam patterns including:
   - Excessive capitalization
   - Excessive special characters
   - Repetitive characters (e.g., "aaaaaaaa")
   - Phone numbers
   - Email addresses
7. **Scam Detection** - Identifies common scam phrases

**Utility Functions:**
- `containsInappropriateContent(text)` - Returns true if content is inappropriate
- `cleanText(text)` - Replaces inappropriate content with asterisks
- `validateAndFilterText(text, fieldName)` - Throws error if inappropriate
- `validateUsername(username)` - Strict username validation
- `validateName(name, type)` - Validates company/product names
- `validateDescription(description, fieldName)` - Validates descriptions

#### Applied Filtering to All User Content

**1. User Signup (`convex/users.ts`)**
- Validates usernames for profanity and inappropriate content
- Ensures usernames are 3-30 characters, alphanumeric with underscores/hyphens only

**2. Products (`convex/products.ts`)**
- Filters product names (1-100 characters)
- Filters product descriptions (up to 1000 characters)
- Applied to both `createProduct` and `updateProduct` mutations

**3. Companies (`convex/companies.ts`)**
- Filters company names (1-100 characters)
- Filters company descriptions (up to 1000 characters)
- Applied to both `createCompany` and `updateCompanyInfo` mutations

**4. Cryptocurrencies (`convex/crypto.ts`)**
- Filters cryptocurrency names
- Filters cryptocurrency descriptions
- Validates ticker symbols (3-6 alphanumeric characters only)
- Applied to `createCryptocurrency` mutation

## Content Validation Rules

### Usernames
- 3-30 characters
- Alphanumeric, underscores, and hyphens only
- No profanity or inappropriate content

### Names (Companies, Products, Crypto)
- 1-100 characters
- No profanity or inappropriate content

### Descriptions
- Optional
- Up to 1000 characters when provided
- No profanity or inappropriate content

### Ticker Symbols
- 3-6 characters
- Uppercase letters and numbers only
- Must be unique

## Error Messages

All validation errors provide clear, actionable feedback:
- "Username contains inappropriate or offensive content. Please choose a different username."
- "Product name contains inappropriate or offensive content. Please choose a different name."
- "Description contains inappropriate or offensive content. Please revise your description."
- "An account with this email already exists. Please use a different email or sign in with your existing account."

## Security Benefits

1. **Prevents Multiple Accounts** - Users cannot exploit the system by creating multiple accounts with the same email
2. **Protects Community** - Filters offensive, hateful, and inappropriate content
3. **Anti-Spam** - Detects and blocks spam patterns
4. **Anti-Scam** - Prevents scam attempts through content validation
5. **PII Protection** - Blocks phone numbers and email addresses in user-generated content

## Dependencies

- **bad-words** (npm package) - Base profanity filter library

## Testing Considerations

The filtering system is comprehensive but may occasionally flag legitimate content. Monitor user feedback for false positives and adjust patterns as needed. The system errs on the side of caution to maintain a safe community environment.

## Future Enhancements

Potential improvements:
1. Add word whitelist for commonly flagged legitimate terms
2. Implement severity levels (warning vs. blocking)
3. Add admin review queue for borderline content
4. Track and log inappropriate content attempts for moderation
5. Implement rate limiting on content creation to prevent spam
