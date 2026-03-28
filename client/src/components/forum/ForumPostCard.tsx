import { ForumPostActionsMenu } from '@/components/forum/ForumPostActionsMenu';
import { ForumVotePill } from '@/components/forum/ForumVotePill';
import {
  extractFirstImageUrlFromPostContent,
  stripFirstMarkdownImage,
} from '@/utils/forumImageUtils';

export type ForumPostCardLabels = {
  upvote: string;
  downvote: string;
  score: string;
  comments: string;
  editPost: string;
  deletePost: string;
  postOptionsAria: string;
};

function avatarInitial(username: string): string {
  const trimmed = username.trim();
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : '?';
}

type ForumPostCardProps = {
  title: string;
  content: string;
  authorUsername: string;
  /** Profile image URL from API, or null for initial fallback */
  authorAvatarUrl?: string | null;
  createdAtLabel: string;
  commentCount: number;
  voteScore: number;
  labels: ForumPostCardLabels;
  onVote: (value: -1 | 1) => void;
  /** Feed: open post. Omit on detail page. */
  onOpenPost?: () => void;
  /** When set, title + excerpt are wrapped in a single click target. */
  lineClampContent?: number;
  /** Smaller type and padding for dense feeds */
  compact?: boolean;
  authorId: string;
  viewerUserId: string | null;
  onEditPost?: () => void;
  onDeletePost?: () => void;
};

export function ForumPostCard({
  title,
  content,
  authorUsername,
  authorAvatarUrl = null,
  createdAtLabel,
  commentCount,
  voteScore,
  labels,
  onVote,
  onOpenPost,
  lineClampContent,
  compact = false,
  authorId,
  viewerUserId,
  onEditPost,
  onDeletePost,
}: ForumPostCardProps) {
  const canManage =
    Boolean(viewerUserId) &&
    viewerUserId === authorId &&
    onEditPost &&
    onDeletePost;

  const meta = `${authorUsername} · ${createdAtLabel}`;
  const imageUrl = extractFirstImageUrlFromPostContent(content);
  const textForExcerpt =
    lineClampContent !== undefined && imageUrl
      ? stripFirstMarkdownImage(content)
      : content;

  const body = (
    <>
      <h3
        className={
          compact
            ? 'text-base font-bold tracking-[0.04em] text-(--text-main) sm:text-[1.05rem]'
            : 'text-lg font-extrabold uppercase tracking-[0.06em] text-(--text-main) sm:text-xl'
        }
      >
        {title}
      </h3>
      <p
        className={
          lineClampContent !== undefined
            ? compact
              ? 'mt-1.5 text-[13px] leading-snug text-(--text-muted)'
              : 'mt-2 text-sm leading-relaxed text-(--text-muted)'
            : compact
              ? 'mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-(--text-main)'
              : 'mt-3 whitespace-pre-wrap text-sm leading-relaxed text-(--text-main)'
        }
        style={
          lineClampContent !== undefined
            ? {
                display: '-webkit-box',
                WebkitLineClamp: lineClampContent,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }
            : undefined
        }
      >
        {textForExcerpt}
      </p>
    </>
  );

  const imageBlock =
    imageUrl && onOpenPost ? (
      <button
        type="button"
        className={`relative mt-2 w-full overflow-hidden rounded-md border border-(--border-main) bg-(--bg-card-soft) text-left transition-opacity hover:opacity-95 ${compact ? 'max-h-40' : 'max-h-48'}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpenPost();
        }}
      >
        <img
          src={imageUrl}
          alt=""
          className="max-h-40 w-full object-cover sm:max-h-48"
        />
      </button>
    ) : null;

  return (
    <article
      className={`ui-panel forum-post-card shrink-0 overflow-hidden rounded-lg border border-(--panel-stroke) shadow-[var(--hud-shadow)] ${compact ? 'px-3 py-3 sm:px-4 sm:py-4' : 'px-4 py-4 sm:px-5 sm:py-5'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
          {authorAvatarUrl ? (
            <img
              src={authorAvatarUrl}
              alt=""
              className={`shrink-0 rounded-full border border-(--border-main) bg-(--bg-card-soft) object-cover ${compact ? 'h-8 w-8 sm:h-9 sm:w-9' : 'h-9 w-9 sm:h-10 sm:w-10'}`}
            />
          ) : (
            <div
              className={`flex shrink-0 items-center justify-center rounded-full border border-(--border-main) bg-(--accent-soft) font-black text-(--accent-secondary) ${compact ? 'h-8 w-8 text-xs sm:h-9 sm:w-9 sm:text-sm' : 'h-9 w-9 text-sm sm:h-10 sm:w-10'}`}
              aria-hidden
            >
              {avatarInitial(authorUsername)}
            </div>
          )}
          <p
            className={`min-w-0 flex-1 font-semibold tracking-wide text-(--text-muted) uppercase ${compact ? 'text-[10px] sm:text-[11px]' : 'text-[11px] tracking-[0.14em] sm:text-xs'}`}
          >
            {meta}
          </p>
        </div>
        {canManage ? (
          <ForumPostActionsMenu
            editLabel={labels.editPost}
            deleteLabel={labels.deletePost}
            optionsAriaLabel={labels.postOptionsAria}
            onEdit={onEditPost}
            onDelete={onDeletePost}
          />
        ) : null}
      </div>

      {onOpenPost ? (
        <>
          <button
            type="button"
            className={`w-full cursor-pointer rounded-md text-left transition-colors hover:opacity-95 ${compact ? 'mt-2' : 'mt-3'}`}
            onClick={onOpenPost}
          >
            {body}
          </button>
          {imageBlock}
        </>
      ) : (
        <div className={compact ? 'mt-2' : 'mt-3'}>{body}</div>
      )}

      <ForumVotePill
        voteScore={voteScore}
        upvoteLabel={labels.upvote}
        downvoteLabel={labels.downvote}
        scoreLabel={labels.score}
        onVote={onVote}
        commentCount={commentCount}
        commentsShortLabel={labels.comments}
        onOpenPost={onOpenPost}
        compact={compact}
      />
    </article>
  );
}
