export type ForumMediaKind = 'image' | 'video';

export type ForumMedia = {
  url: string;
  kind: ForumMediaKind;
};

const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp)(\?[^/\s]*)?$/i;
const VIDEO_EXT_RE = /\.(mp4|webm)(\?[^/\s]*)?$/i;

export function extractFirstForumMedia(content: string): ForumMedia | null {
  return extractForumMediaList(content)[0] ?? null;
}

export function extractForumMediaList(content: string): ForumMedia[] {
  const medias: ForumMedia[] = [];
  const trimmed = content.trim();

  const imageMd = [...trimmed.matchAll(/!\[[^\]]*\]\((https?:[^)\s]+)\)/g)];
  for (const match of imageMd) {
    if (match[1]) {
      medias.push({ url: match[1], kind: 'image' });
    }
  }

  const videoMd = [...trimmed.matchAll(/\[video\]\((https?:[^)\s]+)\)/gi)];
  for (const match of videoMd) {
    if (match[1]) {
      medias.push({ url: match[1], kind: 'video' });
    }
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter((entry) => /^https?:\/\/\S+$/i.test(entry));
  for (const line of lines) {
    if (IMAGE_EXT_RE.test(line)) {
      medias.push({ url: line, kind: 'image' });
    } else if (VIDEO_EXT_RE.test(line)) {
      medias.push({ url: line, kind: 'video' });
    }
  }

  return medias;
}

export function stripFirstForumMedia(content: string): string {
  const withoutImage = content.replace(/!\[[^\]]*\]\([^)]+\)\s*/i, '');
  const withoutVideo = withoutImage.replace(/\[video\]\([^)]+\)\s*/i, '');
  return withoutVideo.trim();
}

export function stripAllForumMedia(content: string): string {
  return content
    .replace(/!\[[^\]]*\]\([^)]+\)\s*/gi, '')
    .replace(/\[video\]\([^)]+\)\s*/gi, '')
    .trim();
}

export function appendMediaToForumContent(
  content: string,
  media: ForumMedia,
): string {
  const normalized = content.trim();
  const mediaLine =
    media.kind === 'video'
      ? `[video](${media.url})`
      : `![forum-media](${media.url})`;
  return normalized.length > 0
    ? `${normalized}\n\n${mediaLine}`
    : mediaLine;
}

export function resolveForumMediaKindFromMime(mimeType: string): ForumMediaKind {
  return mimeType.startsWith('video/') ? 'video' : 'image';
}
