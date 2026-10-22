// Long PDFs use their text layer only for uncomplicated prose. Sparse pages,
// illustrations, RTL, formulas and positioned columns need visual reading.
export function needsVisualReading({ text, items, hasGraphics }) {
  if (text.trim().length < 100 || hasGraphics) return true;
  if (/[\u0590-\u08ff\ufffd∑∫√≤≥≠±×÷²³⁰-⁹]/u.test(text)) return true;
  if (/[=^]|\b(?:sin|cos|tan|log)\b/.test(text)) return true;

  for (let i = 1; i < items.length; i++) {
    const previous = items[i - 1];
    const item = items[i];
    const dy = Math.abs(item.transform[5] - previous.transform[5]);
    const fontSize = Math.max(Math.abs(item.transform[3]), 1);
    // Raised/lowered runs can be exponents or subscripts, not extra digits.
    if (dy > 1 && dy < fontSize * 0.8) return true;
    // A wide gap on one line often separates table cells or columns.
    if (dy < 1 && item.transform[4] - (previous.transform[4] + previous.width) > fontSize * 3) return true;
  }
  return false;
}
