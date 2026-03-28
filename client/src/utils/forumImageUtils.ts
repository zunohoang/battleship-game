/** First markdown image `![](url)` or a lone image URL line. */
export function extractFirstImageUrlFromPostContent(content: string): string | null {
  const trimmed = content.trim();
  const md = trimmed.match(/!\[[^\]]*\]\((https?:[^)\s]+)\)/);
  if (md?.[1]) {
    return md[1];
  }
  const line = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?[^/\s]*)?$/i.test(l));
  return line ?? null;
}

/** Remove first markdown image from text for feed excerpt. */
export function stripFirstMarkdownImage(content: string): string {
  return content.replace(/!\[[^\]]*\]\([^)]+\)\s*/, '').trim();
}
