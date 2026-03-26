import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import {
  createPost,
  listPosts,
  votePost,
} from '@/services/forumService';
import { getApiErrorCode } from '@/services/httpError';
import type { ForumPost } from '@/types/forum';

type SortMode = 'newest' | 'top';

export function ForumFeedPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { isLoggedIn } = useGlobalContext();

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sort, setSort] = useState<SortMode>('newest');
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [limit, total],
  );

  const loadPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorCode(null);
      const response = await listPosts({ page, limit, sort });
      setPosts(response.data);
      setTotal(response.total);
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, sort]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const submitPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoggedIn) {
      navigate('/home');
      return;
    }

    try {
      setIsCreating(true);
      setErrorCode(null);
      await createPost({ title, content });
      setTitle('');
      setContent('');
      setPage(1);
      await loadPosts();
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    } finally {
      setIsCreating(false);
    }
  };

  const onVote = async (postId: string, value: -1 | 1) => {
    if (!isLoggedIn) {
      navigate('/home');
      return;
    }

    try {
      const result = await votePost(postId, value);
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId ? { ...post, voteScore: result.voteScore } : post,
        ),
      );
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    }
  };

  return (
    <main className='relative min-h-screen overflow-hidden px-4 py-5 text-(--text-main) sm:px-8'>
      <div className='ui-page-bg -z-20' />
      <section className='ui-hud-shell mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col gap-5 rounded-md p-4 sm:p-6'>
        <header className='ui-panel rounded-md px-5 py-4'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <p className='ui-title-eyebrow'>{t('forum.feed.eyebrow')}</p>
              <h1 className='mt-2 text-3xl font-black uppercase tracking-[0.08em]'>
                {t('forum.feed.title')}
              </h1>
            </div>
            <div className='flex gap-2'>
              <Button
                className='h-10 px-4'
                variant={sort === 'newest' ? 'primary' : 'default'}
                onClick={() => {
                  setSort('newest');
                  setPage(1);
                }}
              >
                {t('forum.feed.sortNewest')}
              </Button>
              <Button
                className='h-10 px-4'
                variant={sort === 'top' ? 'primary' : 'default'}
                onClick={() => {
                  setSort('top');
                  setPage(1);
                }}
              >
                {t('forum.feed.sortTop')}
              </Button>
            </div>
          </div>
        </header>

        <section className='ui-panel rounded-md px-5 py-4'>
          <h2 className='font-mono text-sm font-bold uppercase tracking-[0.16em] text-(--text-muted)'>
            {t('forum.feed.createPost')}
          </h2>
          <form className='mt-3 grid gap-3' onSubmit={submitPost}>
            <input
              className='ui-input h-11 rounded-sm px-3'
              type='text'
              placeholder={t('forum.feed.titlePlaceholder')}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={!isLoggedIn || isCreating}
              required
            />
            <textarea
              className='ui-input min-h-28 rounded-sm px-3 py-2'
              placeholder={t('forum.feed.contentPlaceholder')}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={!isLoggedIn || isCreating}
              required
            />
            <div className='flex items-center justify-between gap-3'>
              <p className='text-sm text-(--text-muted)'>
                {isLoggedIn
                  ? t('forum.feed.loginStateReady')
                  : t('forum.feed.loginStateRequired')}
              </p>
              <Button
                type='submit'
                variant='primary'
                className='h-10 w-auto px-5'
                disabled={!isLoggedIn || isCreating}
              >
                {isCreating
                  ? t('forum.feed.creating')
                  : t('forum.feed.publish')}
              </Button>
            </div>
          </form>
        </section>

        <section className='grid gap-3'>
          {errorCode ? (
            <div className='rounded-sm border border-(--accent-danger) bg-[rgba(255,90,90,0.14)] px-4 py-3 text-sm font-semibold text-(--text-main)'>
              {t(`errors.${errorCode}`)}
            </div>
          ) : null}

          {isLoading ? (
            <div className='ui-panel rounded-md px-5 py-4 text-sm text-(--text-muted)'>
              {t('forum.feed.loading')}
            </div>
          ) : null}

          {!isLoading && posts.length === 0 ? (
            <div className='ui-panel rounded-md px-5 py-4 text-sm text-(--text-muted)'>
              {t('forum.feed.empty')}
            </div>
          ) : null}

          {posts.map((post) => (
            <article key={post.id} className='ui-panel rounded-md px-5 py-4'>
              <button
                type='button'
                className='w-full cursor-pointer text-left'
                onClick={() => navigate(`/forum/posts/${post.id}`)}
              >
                <h3 className='text-xl font-extrabold uppercase tracking-[0.04em]'>
                  {post.title}
                </h3>
                <p className='mt-2 line-clamp-3 text-sm text-(--text-muted)'>
                  {post.content}
                </p>
              </button>

              <div className='mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold tracking-[0.08em] text-(--text-muted) uppercase'>
                <p>
                  {post.author.username} · {new Date(post.createdAt).toLocaleString()}
                </p>
                <p>
                  {post.commentCount} {t('forum.feed.comments')}
                </p>
              </div>

              <div className='mt-3 flex gap-2'>
                <Button className='h-9 px-3' onClick={() => onVote(post.id, 1)}>
                  ▲ {t('forum.feed.upvote')}
                </Button>
                <Button className='h-9 px-3' onClick={() => onVote(post.id, -1)}>
                  ▼ {t('forum.feed.downvote')}
                </Button>
                <div className='ui-subpanel rounded-sm px-3 py-2 text-sm font-bold'>
                  {t('forum.feed.score')}: {post.voteScore}
                </div>
              </div>
            </article>
          ))}
        </section>

        <footer className='ui-panel mt-auto flex items-center justify-between rounded-md px-5 py-3'>
          <p className='text-sm text-(--text-muted)'>
            {t('forum.feed.page')} {page}/{totalPages}
          </p>
          <div className='flex gap-2'>
            <Button
              className='h-9 w-auto px-4'
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t('forum.feed.prev')}
            </Button>
            <Button
              className='h-9 w-auto px-4'
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              {t('forum.feed.next')}
            </Button>
          </div>
        </footer>
      </section>
    </main>
  );
}
