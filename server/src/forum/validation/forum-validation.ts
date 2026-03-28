export const FORUM_ALLOWED_SORTS = ['newest', 'top', 'comments'] as const;

export const FORUM_SEARCH_QUERY_MAX_LENGTH = 200;

export const FORUM_POST_TITLE_MAX_LENGTH = 150;
export const FORUM_POST_CONTENT_MAX_LENGTH = 5000;
export const FORUM_COMMENT_CONTENT_MAX_LENGTH = 1200;

export function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function sanitizeForumText(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/\r\n/g, '\n').trim();
}