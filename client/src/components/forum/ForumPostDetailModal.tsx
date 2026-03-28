import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ForumRedditComment } from '@/components/forum/ForumComment';
import { ForumVotePill } from '@/components/forum/ForumVotePill';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import {
  createComment,
  getPost,
  listComments,
  voteComment,
  votePost,
} from '@/services/forumService';
import { getApiErrorCode } from '@/services/httpError';
import type { ForumComment, ForumPost } from '@/types/forum';
import {
  extractFirstImageUrlFromPostContent,
  stripFirstMarkdownImage,
} from '@/utils/forumImageUtils';

type ForumPostDetailModalProps = {
  postId: string | null;
  onClose: () => void;
  onPostVoteUpdated?: (postId: string, voteScore: number) => void;
  onPostCommentCountDelta?: (postId: string, delta: number) => void;
};

export function ForumPostDetailModal({
  postId,
  onClose,
  onPostVoteUpdated,
  onPostCommentCountDelta,
}: ForumPostDetailModalProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { isLoggedIn } = useGlobalContext();

  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const labels = useMemo(
    () => ({
      upvote: t('forum.feed.upvote'),
      downvote: t('forum.feed.downvote'),
      score: t('forum.feed.score'),
      comments: t('forum.feed.comments'),
    }),
    [t],
  );

  const loadDetail = useCallback(async () => {
    if (!postId) {
      return;
    }
    try {
      setErrorCode(null);
      setIsLoading(true);
      const [postData, commentData] = await Promise.all([
        getPost(postId),
        listComments(postId),
      ]);
      setPost(postData);
      setComments(commentData);
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (!postId) {
      setPost(null);
      setComments([]);
      setCommentContent('');
      setErrorCode(null);
      return;
    }
    void loadDetail();
  }, [loadDetail, postId]);

  useEffect(() => {
    if (!postId) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [postId, onClose]);

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!postId) {
      return;
    }
    if (!isLoggedIn) {
      navigate('/home');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorCode(null);
      await createComment(postId, { content: commentContent });
      setCommentContent('');
      await loadDetail();
      onPostCommentCountDelta?.(postId, 1);
      setPost((previous) =>
        previous
          ? { ...previous, commentCount: previous.commentCount + 1 }
          : previous,
      );
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVotePost = async (value: -1 | 1) => {
    if (!postId) {
      return;
    }
    if (!isLoggedIn) {
      navigate('/home');
      return;
    }

    try {
      const vote = await votePost(postId, value);
      setPost((previous) =>
        previous ? { ...previous, voteScore: vote.voteScore } : previous,
      );
      onPostVoteUpdated?.(postId, vote.voteScore);
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    }
  };

  const onVoteComment = async (commentId: string, value: -1 | 1) => {
    if (!isLoggedIn) {
      navigate('/home');
      return;
    }

    try {
      const vote = await voteComment(commentId, value);
      setComments((previous) =>
        previous.map((comment) =>
          comment.id === commentId
            ? { ...comment, voteScore: vote.voteScore }
            : comment,
        ),
      );
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    }
  };

  if (!postId) {
    return null;
  }

  const imageUrl = post
    ? extractFirstImageUrlFromPostContent(post.content)
    : null;
  const postBodyText = post
    ? imageUrl
      ? stripFirstMarkdownImage(post.content)
      : post.content
    : undefined;

  return createPortal(
    <div
      className='forum-composer-fullscreen-backdrop fixed inset-0 z-[210] flex items-stretch justify-center p-0 sm:p-4 sm:pt-5'
      role='dialog'
      aria-modal='true'
      aria-labelledby='forum-post-modal-title'
      onClick={onClose}
    >
      <div
        className='forum-composer-fullscreen-panel themed-scrollbar relative z-10 flex max-h-[100dvh] w-full max-w-[min(52rem,calc(100vw-0px))] flex-col overflow-hidden rounded-none shadow-[var(--hud-shadow-strong)] sm:max-h-[min(92dvh,880px)] sm:rounded-lg'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='flex shrink-0 items-center justify-between gap-3 border-b border-(--border-main) bg-(--bg-card-soft) px-4 py-3 sm:px-5'>
          <h2
            id='forum-post-modal-title'
            className='min-w-0 truncate font-mono text-xs font-bold tracking-[0.16em] text-(--text-muted) uppercase'
          >
            {t('forum.post.modalTitle')}
          </h2>
          <Button
            type='button'
            variant='default'
            className='!flex !h-10 !min-h-10 !w-10 !min-w-10 shrink-0 items-center justify-center p-0'
            onClick={onClose}
          >
            <X className='h-5 w-5' aria-hidden />
          </Button>
        </div>

        <div className='themed-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto'>
          {isLoading ? (
            <div className='px-4 py-4 text-sm text-(--text-muted) sm:px-5'>
              {t('forum.feed.loading')}
            </div>
          ) : null}

          {!isLoading && post ? (
            <div className='border-b border-(--border-main) px-4 py-4 sm:px-5 sm:py-5'>
              <p className='text-[11px] font-semibold tracking-wide text-(--text-muted) uppercase'>
                {post.author.username} · {new Date(post.createdAt).toLocaleString()}
              </p>
              <h3 className='mt-2 text-xl font-black uppercase tracking-[0.06em] text-(--text-main) sm:text-2xl'>
                {post.title}
              </h3>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=''
                  className='mt-3 max-h-[min(50vh,420px)] w-full rounded-md border border-(--border-main) object-contain'
                />
              ) : null}
              <p className='mt-3 whitespace-pre-wrap text-sm leading-relaxed text-(--text-main)'>
                {postBodyText ?? ''}
              </p>
              <ForumVotePill
                voteScore={post.voteScore}
                upvoteLabel={labels.upvote}
                downvoteLabel={labels.downvote}
                scoreLabel={labels.score}
                onVote={onVotePost}
                commentCount={post.commentCount}
                commentsShortLabel={labels.comments}
                onOpenPost={() => {
                  const el = document.getElementById('forum-post-comments-heading');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              />
            </div>
          ) : null}

          {errorCode ? (
            <div className='mx-4 mb-4 rounded-sm border border-(--accent-danger) bg-[rgba(255,90,90,0.14)] px-4 py-3 text-sm font-semibold text-(--text-main) sm:mx-5'>
              {t(`errors.${errorCode}`)}
            </div>
          ) : null}

          <div className='border-b border-(--border-main) px-4 py-4 sm:px-5 sm:py-4'>
            <h4 className='font-mono text-xs font-bold tracking-[0.16em] text-(--text-muted) uppercase'>
              {t('forum.post.addComment')}
            </h4>
            <form className='mt-3 grid gap-3' onSubmit={submitComment}>
              <textarea
                className='ui-input themed-scrollbar min-h-24 rounded-sm px-3 py-2'
                placeholder={t('forum.post.commentPlaceholder')}
                value={commentContent}
                onChange={(event) => setCommentContent(event.target.value)}
                disabled={!isLoggedIn || isSubmitting}
                required
              />
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <p className='text-sm text-(--text-muted)'>
                  {isLoggedIn
                    ? t('forum.feed.loginStateReady')
                    : t('forum.feed.loginStateRequired')}
                </p>
                <Button
                  type='submit'
                  variant='primary'
                  className='h-10 w-auto px-5 sm:min-w-[10rem]'
                  disabled={!isLoggedIn || isSubmitting}
                >
                  {isSubmitting
                    ? t('forum.post.submitting')
                    : t('forum.post.submitComment')}
                </Button>
              </div>
            </form>
          </div>

          <div id='forum-post-comments-heading' className='px-4 py-4 sm:px-5 sm:py-5'>
            <h3 className='font-mono text-[11px] font-bold tracking-[0.2em] text-(--text-muted) uppercase'>
              {t('forum.post.commentsHeading')}
            </h3>
            <div className='mt-4 flex flex-col gap-6'>
              {comments.map((comment) => (
                <ForumRedditComment
                  key={comment.id}
                  authorUsername={comment.author.username}
                  createdAtLabel={new Date(comment.createdAt).toLocaleString()}
                  content={comment.content}
                  voteScore={comment.voteScore}
                  labels={labels}
                  onVote={(value: -1 | 1) => onVoteComment(comment.id, value)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
