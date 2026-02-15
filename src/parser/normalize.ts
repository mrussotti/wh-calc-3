/** Name normalization utilities for matching parsed names to Wahapedia data */

/** Normalize smart quotes and whitespace for name matching */
export function normalizeName(name: string): string {
  return name
    .replace(/[\u2018\u2019\u0060\u00B4]/g, "'")  // smart single quotes → straight
    .replace(/[\u201C\u201D]/g, '"')                 // smart double quotes → straight
    .trim()
    .toLowerCase();
}

/** Strip HTML tags from Wahapedia description fields */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
