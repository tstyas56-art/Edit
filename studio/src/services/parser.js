export function parseTranslationText(text) {
  if (!text || typeof text !== 'string') return [];
  
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  return lines.map((line, index) => ({
    index: index + 1,
    content: line.trim(),
    isPlaced: false,
    placedOnPageId: null,
    placedLayerId: null,
  }));
}

export function detectDialogueCount(text) {
  return parseTranslationText(text).length;
}

export function parseTxtFile(content) {
  return parseTranslationText(content);
}

export function formatDialoguePreview(lines, maxLines = 5) {
  return lines.slice(0, maxLines).map((line, i) => `${i + 1}. ${line.content}`).join('\n');
}

export function isArabicText(text) {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicRegex.test(text);
}