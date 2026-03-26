import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
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

export function ForumPostPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const { isLoggedIn } = useGlobalContext();

  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!postId) {
      navigate('/forum');
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
  }, [navigate, postId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

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

  if (isLoading) {
    return (
      <main className='relative min-h-screen overflow-hidden px-4 py-5 text-(--text-main) sm:px-8'>
        <div className='ui-page-bg -z-20' />
        <section className='ui-hud-shell mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col gap-5 rounded-md p-6'>
          <div className='ui-panel rounded-md px-5 py-4 text-sm text-(--text-muted)'>
            {t('forum.feed.loading')}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className='relative min-h-screen overflow-hidden px-4 py-5 text-(--text-main) sm:px-8'>
      <div className='ui-page-bg -z-20' />
      <section className='ui-hud-shell mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col gap-5 rounded-md p-6'>
        <header className='ui-panel rounded-md px-5 py-4'>
          <Button className='h-9 w-auto px-4' onClick={() => navigate('/forum')}>
            {t('forum.post.back')}
          </Button>

          {post ? (
            <>
              <p className='mt-4 text-xs font-semibold tracking-[0.14em] text-(--text-muted) uppercase'>
                {post.author.username} · {new Date(post.createdAt).toLocaleString()}
              </p>
              <h1 className='mt-2 text-3xl font-black uppercase tracking-[0.08em]'>
                {post.title}
              </h1>
              <p className='mt-3 whitespace-pre-wrap text-sm text-(--text-main)'>
                {post.content}
              </p>

              <div className='mt-4 flex gap-2'>
                <Button className='h-9 px-3' onClick={() => onVotePost(1)}>
                  ▲ {t('forum.feed.upvote')}
                </Button>
                <Button className='h-9 px-3' onClick={() => onVotePost(-1)}>
                  ▼ {t('forum.feed.downvote')}
                </Button>
                <div className='ui-subpanel rounded-sm px-3 py-2 text-sm font-bold'>
                  {t('forum.feed.score')}: {post.voteScore}
                </div>
              </div>
            </>
          ) : null}
        </header>

        {errorCode ? (
          <div className='rounded-sm border border-(--accent-danger) bg-[rgba(255,90,90,0.14)] px-4 py-3 text-sm font-semibold text-(--text-main)'>
            {t(`errors.${errorCode}`)}
          </div>
        ) : null}

        <section className='ui-panel rounded-md px-5 py-4'>
          <h2 className='font-mono text-sm font-bold uppercase tracking-[0.16em] text-(--text-muted)'>
            {t('forum.post.addComment')}
          </h2>
          <form className='mt-3 grid gap-3' onSubmit={submitComment}>
            <textarea
              className='ui-input min-h-24 rounded-sm px-3 py-2'
              placeholder={t('forum.post.commentPlaceholder')}
              value={commentContent}
              onChange={(event) => setCommentContent(event.target.value)}
              disabled={!isLoggedIn || isSubmitting}
              required
            />
            <div className='flex justify-end'>
              <Button
                type='submit'
                variant='primary'
                className='h-10 w-auto px-5'
                disabled={!isLoggedIn || isSubmitting}
              >
                {isSubmitting
                  ? t('forum.post.submitting')
                  : t('forum.post.submitComment')}
              </Button>
            </div>
          </form>
        </section>

        <section className='grid gap-3'>
          {comments.map((comment) => (
            <article key={comment.id} className='ui-panel rounded-md px-5 py-4'>
              <p className='text-xs font-semibold tracking-[0.14em] text-(--text-muted) uppercase'>
                {comment.author.username} ·{' '}
                {new Date(comment.createdAt).toLocaleString()}
              </p>
              <p className='mt-2 whitespace-pre-wrap text-sm'>{comment.content}</p>
              <div className='mt-3 flex gap-2'>
                <Button
                  className='h-8 px-3'
                  onClick={() => onVoteComment(comment.id, 1)}
                >
                  ▲
                </Button>
                <Button
                  className='h-8 px-3'
                  onClick={() => onVoteComment(comment.id, -1)}
                >
                  ▼
                </Button>
                <div className='ui-subpanel rounded-sm px-3 py-1 text-sm font-bold'>
                  {t('forum.feed.score')}: {comment.voteScore}
                </div>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
