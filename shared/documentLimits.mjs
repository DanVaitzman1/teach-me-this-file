// Resource bounds for one stateless request. Exceeding them is an error,
// never permission to silently discard the end of a student's document.
export const MAX_FILE_MB = 25;
export const MAX_PDF_PAGES = 200;
export const MAX_DOCUMENT_CHARS = 500_000;
export const MAX_PASSAGE_CHARS = 1200;
export const MAX_PASSAGES = 1000;
export const MAX_STEP_PASSAGES = 40;
