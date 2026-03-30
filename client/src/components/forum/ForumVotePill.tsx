import { MessageSquare } from 'lucide-react';

type ForumVotePillProps = {
  voteScore: number;
  upvoteLabel: string;
  downvoteLabel: string;
  scoreLabel: string;
  onVote: (value: -1 | 1) => void;
  commentCount?: number;
  /** Required when `onOpenPost` and `commentCount` are used for the comment pill. */
  commentsShortLabel?: string;
  onOpenPost?: () => void;
  compact?: boolean;
};

export function ForumVotePill({
  voteScore,
  upvoteLabel,
  downvoteLabel,
  scoreLabel,
  onVote,
  commentCount,
  commentsShortLabel,
  onOpenPost,
  compact = false,
}: ForumVotePillProps) {
  const btn = compact
    ? 'flex min-h-8 min-w-8 cursor-pointer items-center justify-center rounded-full border border-(--border-main) bg-(--surface-subtle-bg) text-(--text-main) text-[11px] font-bold tracking-wide transition-colors hover:border-(--border-strong) hover:bg-(--surface-idle-bg-hover) disabled:cursor-not-allowed disabled:opacity-45'
    : 'flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-full border border-(--border-main) bg-(--surface-subtle-bg) text-(--text-main) text-xs font-bold tracking-wide transition-colors hover:border-(--border-strong) hover:bg-(--surface-idle-bg-hover) disabled:cursor-not-allowed disabled:opacity-45';

  return (
    <div
      className={`flex flex-wrap items-center ${compact ? 'gap-1.5' : 'gap-2'} ${compact ? 'mt-2' : 'mt-4'}`}
    >
      <div
        className='inline-flex items-stretch overflow-hidden rounded-full border border-(--border-main) bg-(--bg-card-soft)'
        role='group'
        aria-label={scoreLabel}
      >
        <button
          type='button'
          className={`${btn} rounded-none border-0 border-r border-(--border-main) ${compact ? 'px-2.5' : 'px-3'}`}
          title={upvoteLabel}
          onClick={(event) => {
            event.stopPropagation();
            onVote(1);
          }}
        >
          ▲
        </button>
        <span
          className={`flex min-w-[2.25rem] items-center justify-center px-1.5 font-mono font-bold tabular-nums text-(--text-main) ${compact ? 'text-xs' : 'text-sm'}`}
        >
          {voteScore}
        </span>
        <button
          type='button'
          className={`${btn} rounded-none border-0 border-l border-(--border-main) ${compact ? 'px-2.5' : 'px-3'}`}
          title={downvoteLabel}
          onClick={(event) => {
            event.stopPropagation();
            onVote(-1);
          }}
        >
          ▼
        </button>
      </div>

      {onOpenPost !== undefined &&
      commentCount !== undefined &&
      commentsShortLabel !== undefined ? (
          <button
            type='button'
            className='inline-flex items-center gap-2 rounded-full border border-(--border-main) bg-(--surface-subtle-bg) px-3 py-2 text-xs font-bold tracking-[0.12em] text-(--text-main) uppercase transition-colors hover:border-(--border-strong) hover:bg-(--surface-idle-bg-hover)'
            onClick={(event) => {
              event.stopPropagation();
              onOpenPost();
            }}
          >
            <MessageSquare
              className={`shrink-0 text-(--text-muted) ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`}
              aria-hidden
            />
            <span>
              {commentCount} {commentsShortLabel}
            </span>
          </button>
        ) : null}
    </div>
  );
}
