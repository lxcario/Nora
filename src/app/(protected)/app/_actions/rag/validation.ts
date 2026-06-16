/**
 * Pure validation helpers for the RAG pipeline.
 * No side effects, no imports needed.
 * Used by server actions and tested with property-based tests.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const MAX_UPLOAD_SIZE = 20 * 1024 * 1024; // 20 MB in bytes
const MAX_URL_LENGTH = 2048;
const MIN_QUESTION_LENGTH = 3;
const MAX_QUESTION_LENGTH = 500;
const MAX_CARD_FRONT_LENGTH = 200;
const MAX_CARD_BACK_LENGTH = 1000;
const MIN_FEYNMAN_LENGTH = 10;
const MAX_FEYNMAN_LENGTH = 500;
const MIN_EXTRACTED_TEXT_CHARS = 20;

/**
 * Validates PDF upload: .pdf extension, application/pdf MIME, ≤ 20 MB.
 */
export function validateUploadInput(file: {
  name: string;
  type: string;
  size: number;
}): ValidationResult {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return { valid: false, error: "File must have a .pdf extension" };
  }

  if (file.type !== "application/pdf") {
    return { valid: false, error: "File must be of type application/pdf" };
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return {
      valid: false,
      error: "File exceeds the maximum allowed size of 20 MB",
    };
  }

  return { valid: true };
}

/**
 * Validates URL: must be http/https scheme, ≤ 2048 characters.
 */
export function validateUrl(url: string): ValidationResult {
  if (url.length > MAX_URL_LENGTH) {
    return {
      valid: false,
      error: "URL exceeds the maximum length of 2048 characters",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "URL is not valid" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "URL must use http or https scheme" };
  }

  return { valid: true };
}

/**
 * Validates RAG question: 3-500 characters.
 */
export function validateQuestion(text: string): ValidationResult {
  if (text.length < MIN_QUESTION_LENGTH) {
    return {
      valid: false,
      error: "Question must be at least 3 characters",
    };
  }

  if (text.length > MAX_QUESTION_LENGTH) {
    return {
      valid: false,
      error: "Question must be at most 500 characters",
    };
  }

  return { valid: true };
}

/**
 * Validates card fields: front 1-200 chars, back 1-1000 chars.
 * Each field must contain at least 1 non-whitespace character.
 */
export function validateCardFields(front: string, back: string): ValidationResult {
  if (front.trim().length === 0) {
    return {
      valid: false,
      error: "Card front must contain at least 1 non-whitespace character",
    };
  }

  if (front.length > MAX_CARD_FRONT_LENGTH) {
    return {
      valid: false,
      error: "Card front must be at most 200 characters",
    };
  }

  if (back.trim().length === 0) {
    return {
      valid: false,
      error: "Card back must contain at least 1 non-whitespace character",
    };
  }

  if (back.length > MAX_CARD_BACK_LENGTH) {
    return {
      valid: false,
      error: "Card back must be at most 1000 characters",
    };
  }

  return { valid: true };
}

/**
 * Validates Feynman selection: 10-500 characters.
 */
export function validateFeynmanSelection(text: string): ValidationResult {
  if (text.length < MIN_FEYNMAN_LENGTH) {
    return {
      valid: false,
      error: "Selection must be at least 10 characters",
    };
  }

  if (text.length > MAX_FEYNMAN_LENGTH) {
    return {
      valid: false,
      error: "Selection must be at most 500 characters",
    };
  }

  return { valid: true };
}

/**
 * Validates paper state consistency: error must be null when status is
 * pending, processing, or ready.
 */
export function validatePaperState(
  status: string,
  error: string | null
): ValidationResult {
  const noErrorStatuses = ["pending", "processing", "ready"];

  if (noErrorStatuses.includes(status) && error !== null) {
    return {
      valid: false,
      error: `parse_error must be null when parse_status is "${status}"`,
    };
  }

  return { valid: true };
}

/**
 * Checks extracted text meets minimum threshold: ≥ 20 non-whitespace chars.
 */
export function validateExtractedText(text: string): ValidationResult {
  const nonWhitespaceCount = text.replace(/\s/g, "").length;

  if (nonWhitespaceCount < MIN_EXTRACTED_TEXT_CHARS) {
    return {
      valid: false,
      error:
        "Extracted text contains fewer than 20 non-whitespace characters; document may be scanned or image-only",
    };
  }

  return { valid: true };
}
