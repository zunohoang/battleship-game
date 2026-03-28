import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import {
  ForumFeedSidebar,
  type ForumSortMode,
} from '@/components/forum/ForumFeedSidebar';
import { ForumCreatePostComposer } from '@/components/forum/ForumCreatePostComposer';
import { ForumPostDetailModal } from '@/components/forum/ForumPostDetailModal';
import { ForumPostCard } from '@/components/forum/ForumPostCard';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import { createPost, listPosts, votePost } from '@/services/forumService';
import { getApiErrorCode } from '@/services/httpError';
import type { ForumPost } from '@/types/forum';

/** Feed + API page size (must match server `ForumPostsQueryDto` default). */
const FORUM_FEED_PAGE_SIZE = 10;

export function ForumFeedPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isLoggedIn } = useGlobalContext();

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [limit] = useState(FORUM_FEED_PAGE_SIZE);
  const [sort, setSort] = useState<ForumSortMode>('newest');
  const [appliedSearch, setAppliedSearch] = useState<string | undefined>(
    undefined,
  );
  const [searchDraft, setSearchDraft] = useState('');
  const [total, setTotal] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [composerFullscreen, setComposerFullscreen] = useState(false);
  const [modalPostId, setModalPostId] = useState<string | null>(null);

  const postsRef = useRef<ForumPost[]>([]);
  const totalRef = useRef(0);
  const loadMoreLockRef = useRef(false);
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  const composerLabels = useMemo(
    () => ({
      sectionTitle: t('forum.feed.createPost'),
      titlePlaceholder: t('forum.feed.titlePlaceholder'),
      contentPlaceholder: t('forum.feed.contentPlaceholder'),
      loginStateReady: t('forum.feed.loginStateReady'),
      loginStateRequired: t('forum.feed.loginStateRequired'),
      creating: t('forum.feed.creating'),
      publish: t('forum.feed.publish'),
      collapsedHint: t('forum.feed.createPostCollapsedHint'),
      openFullscreen: t('forum.feed.openFullscreen'),
      collapseComposer: t('forum.feed.collapseComposer'),
      closeFullscreen: t('forum.feed.closeFullscreen'),
    }),
    [t],
  );

  const sidebarLabels = useMemo(
    () => ({
      searchEyebrow: t('forum.feed.searchEyebrow'),
      searchPlaceholder: t('forum.feed.searchInputPlaceholder'),
      searchSubmit: t('forum.feed.searchSubmit'),
      filtersTitle: t('forum.feed.filtersTitle'),
      sortNewest: t('forum.feed.sortNewest'),
      sortTop: t('forum.feed.sortTop'),
      sortComments: t('forum.feed.sortComments'),
    }),
    [t],
  );

  const postCardLabels = useMemo(
    () => ({
      upvote: t('forum.feed.upvote'),
      downvote: t('forum.feed.downvote'),
      score: t('forum.feed.score'),
      comments: t('forum.feed.comments'),
    }),
    [t],
  );

  const loadInitial = useCallback(async () => {
    loadMoreLockRef.current = false;
    setIsInitialLoading(true);
    setErrorCode(null);
    try {
      const response = await listPosts({
        page: 1,
        limit,
        sort,
        q: appliedSearch,
      });
      setPosts(response.data);
      setTotal(response.total);
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    } finally {
      setIsInitialLoading(false);
    }
  }, [appliedSearch, limit, sort]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadMoreLockRef.current || isInitialLoading) {
      return;
    }
    const len = postsRef.current.length;
    const tot = totalRef.current;
    if (tot === 0 || len >= tot) {
      return;
    }

    loadMoreLockRef.current = true;
    setIsLoadingMore(true);
    setErrorCode(null);
    const nextPage = Math.floor(len / limit) + 1;

    try {
      const response = await listPosts({
        page: nextPage,
        limit,
        sort,
        q: appliedSearch,
      });
      if (response.data.length === 0) {
        setTotal(len);
        return;
      }
      setPosts((previous) => {
        const seen = new Set(previous.map((post) => post.id));
        const merged = [...previous];
        for (const post of response.data) {
          if (!seen.has(post.id)) {
            merged.push(post);
            seen.add(post.id);
          }
        }
        return merged;
      });
      setTotal(response.total);
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    } finally {
      loadMoreLockRef.current = false;
      setIsLoadingMore(false);
    }
  }, [appliedSearch, isInitialLoading, limit, sort]);

  useEffect(() => {
    const root = scrollRootRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (visible) {
          void loadMore();
        }
      },
      {
        root,
        rootMargin: '320px 0px 120px 0px',
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    const id = searchParams.get('openPost');
    if (!id) {
      return;
    }
    setModalPostId(id);
    const next = new URLSearchParams(searchParams);
    next.delete('openPost');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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
      setComposerExpanded(false);
      setComposerFullscreen(false);
      await loadInitial();
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    } finally {
      setIsCreating(false);
    }
  };

  const onSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = searchDraft.trim();
    setAppliedSearch(next.length > 0 ? next : undefined);
  };

  const onSortChange = (next: ForumSortMode) => {
    setSort(next);
  };

  const onBack = () => {
    navigate('/home');
  };

  const openPostModal = (postId: string) => {
    setModalPostId(postId);
  };

  const onPostVoteFromModal = useCallback(
    (postId: string, voteScore: number) => {
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId ? { ...post, voteScore } : post,
        ),
      );
    },
    [],
  );

  const onPostCommentDeltaFromModal = useCallback(
    (postId: string, delta: number) => {
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? { ...post, commentCount: Math.max(0, post.commentCount + delta) }
            : post,
        ),
      );
    },
    [],
  );

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
    <main className="relative flex h-[100dvh] flex-col overflow-hidden pt-0 text-(--text-main) pb-3 sm:pb-4">
      <div className="ui-page-bg -z-20" />
      <section className="ui-hud-shell flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-none border-x-0 px-3 sm:gap-5 sm:px-4 md:px-6 lg:h-full lg:min-h-0 lg:gap-4 lg:px-6 xl:px-8">
        <header className="ui-panel flex w-full min-w-0 shrink-0 items-center justify-between gap-3 rounded-lg border border-(--panel-stroke) px-4 py-3 shadow-[var(--hud-shadow)] sm:gap-4 sm:px-5 sm:py-4">
          <div className="min-w-0 flex-1">
            <p className="ui-title-eyebrow">{t('forum.feed.eyebrow')}</p>
            <h1 className="mt-1 text-xl font-black uppercase tracking-[0.08em] sm:text-2xl">
              {t('forum.feed.title')}
            </h1>
          </div>
          <Button
            type="button"
            variant="default"
            className="!h-10 !w-auto shrink-0 whitespace-nowrap px-4 sm:px-5 inline-flex items-center justify-center gap-2"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            <span>{t('forum.feed.backLabel')}</span>
          </Button>
        </header>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:items-stretch">
          <ForumFeedSidebar
            searchDraft={searchDraft}
            onSearchDraftChange={setSearchDraft}
            onSearchSubmit={onSearchSubmit}
            sort={sort}
            onSortChange={onSortChange}
            labels={sidebarLabels}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden lg:h-full">
            <div className="shrink-0">
              <ForumCreatePostComposer
                labels={composerLabels}
                isLoggedIn={isLoggedIn}
                title={title}
                content={content}
                onTitleChange={setTitle}
                onContentChange={setContent}
                isCreating={isCreating}
                onSubmit={submitPost}
                expanded={composerExpanded}
                fullscreen={composerFullscreen}
                onExpand={() => setComposerExpanded(true)}
                onCollapse={() => {
                  setComposerExpanded(false);
                  setComposerFullscreen(false);
                }}
                onOpenFullscreen={() => {
                  setComposerFullscreen(true);
                  setComposerExpanded(true);
                }}
                onCloseFullscreen={() => setComposerFullscreen(false)}
              />
            </div>

            <div
              ref={scrollRootRef}
              className="themed-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1"
            >
              <div className="space-y-3">
                {errorCode ? (
                  <div className="rounded-sm border border-(--accent-danger) bg-[rgba(255,90,90,0.14)] px-4 py-3 text-sm font-semibold text-(--text-main)">
                    {t(`errors.${errorCode}`)}
                  </div>
                ) : null}

                {isInitialLoading ? (
                  <div className="ui-panel rounded-lg px-4 py-3 text-sm text-(--text-muted) sm:px-5 sm:py-4">
                    {t('forum.feed.loading')}
                  </div>
                ) : null}

                {!isInitialLoading && posts.length === 0 ? (
                  <div className="ui-panel rounded-lg px-4 py-3 text-sm text-(--text-muted) sm:px-5 sm:py-4">
                    {t('forum.feed.empty')}
                  </div>
                ) : null}

                {posts.map((post) => (
                  <ForumPostCard
                    key={post.id}
                    title={post.title}
                    content={post.content}
                    authorUsername={post.author.username}
                    createdAtLabel={new Date(post.createdAt).toLocaleString()}
                    commentCount={post.commentCount}
                    voteScore={post.voteScore}
                    labels={postCardLabels}
                    lineClampContent={6}
                    compact
                    onVote={(value) => onVote(post.id, value)}
                    onOpenPost={() => openPostModal(post.id)}
                  />
                ))}

                <div
                  ref={sentinelRef}
                  className="h-px w-full shrink-0"
                  aria-hidden
                />

                {isLoadingMore ? (
                  <p className="pb-2 text-center text-sm text-(--text-muted)">
                    {t('forum.feed.loadingMore')}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <ForumPostDetailModal
        postId={modalPostId}
        onClose={() => setModalPostId(null)}
        onPostVoteUpdated={onPostVoteFromModal}
        onPostCommentCountDelta={onPostCommentDeltaFromModal}
      />
    </main>
  );
}
