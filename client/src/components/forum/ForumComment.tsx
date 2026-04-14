import { ForumVotePill } from '@/components/forum/ForumVotePill';
import { ForumPostActionsMenu } from '@/components/forum/ForumPostActionsMenu';
import type { ForumPostCardLabels } from '@/components/forum/ForumPostCard';

type ForumRedditCommentProps = {
  authorUsername: string;
  createdAtLabel: string;
  content: string;
  voteScore: number;
  labels: Pick<
    ForumPostCardLabels,
    'upvote' | 'downvote' | 'score' | 'deletePost' | 'banUser' | 'postOptionsAria'
  >;
  onVote: (value: -1 | 1) => void;
  canManageComment?: boolean;
  canBanCommentAuthor?: boolean;
  onDelete?: () => void;
  onBanAuthor?: () => void;
};

function avatarInitial(username: string): string {
  const t = username.trim();
  return t.length > 0 ? t[0].toUpperCase() : '?';
}

export function ForumRedditComment({
  authorUsername,
  createdAtLabel,
  content,
  voteScore,
  labels,
  onVote,
  canManageComment = false,
  canBanCommentAuthor = false,
  onDelete,
  onBanAuthor,
}: ForumRedditCommentProps) {
  return (
    <div className='flex gap-2 sm:gap-3'>
      <div className='flex w-8 shrink-0 flex-col items-center sm:w-9'>
        <div
          className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-(--border-main) bg-(--accent-soft) text-xs font-black text-(--accent-secondary) sm:h-9 sm:w-9 sm:text-sm'
          aria-hidden
        >
          {avatarInitial(authorUsername)}
        </div>
        <div
          className='mt-1 w-px flex-1 min-h-[12px] bg-(--border-main)'
          aria-hidden
        />
      </div>
      <div className='min-w-0 flex-1 rounded-md border border-(--border-main) bg-(--bg-card-soft) px-3 py-2.5 sm:px-4 sm:py-3'>
        <div className='flex items-start justify-between gap-2'>
          <p className='text-[13px] font-bold text-(--text-main) sm:text-sm'>
            <span>{authorUsername}</span>
            <span className='font-normal text-(--text-muted)'> · </span>
            <span className='text-xs font-medium text-(--text-muted)'>
              {createdAtLabel}
            </span>
          </p>
          {canManageComment && onDelete ? (
            <ForumPostActionsMenu
              deleteLabel={labels.deletePost}
              banUserLabel={labels.banUser}
              optionsAriaLabel={labels.postOptionsAria}
              onDelete={onDelete}
              onBanUser={canBanCommentAuthor ? onBanAuthor : undefined}
            />
          ) : null}
        </div>
        <p className='mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-(--text-main) sm:text-sm'>
          {content}
        </p>
        <ForumVotePill
          voteScore={voteScore}
          upvoteLabel={labels.upvote}
          downvoteLabel={labels.downvote}
          scoreLabel={labels.score}
          onVote={onVote}
          compact
        />
      </div>
    </div>
  );
}
