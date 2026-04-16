import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BanUserModal } from '@/components/forum/BanUserModal';
import { ForumRedditComment } from '@/components/forum/ForumComment';
import { ForumPostActionsMenu } from '@/components/forum/ForumPostActionsMenu';
import { ForumVotePill } from '@/components/forum/ForumVotePill';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import {
  archivePost,
  archiveComment,
  banUser,
  createComment,
  getPost,
  listComments,
  uploadForumMedia,
  updatePost,
  voteComment,
  votePost,
} from '@/services/forumService';
import { getApiErrorCode } from '@/services/httpError';
import type { ForumComment, ForumPost } from '@/types/forum';
import {
  appendMediaToForumContent,
  extractFirstForumMedia,
  extractForumMediaList,
  resolveForumMediaKindFromMime,
  stripAllForumMedia,
} from '@/utils/forumMediaUtils';

const FORUM_MEDIA_MAX_SIZE_BYTES = 15 * 1024 * 1024;
const FORUM_MEDIA_ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
]);

type ForumPostDetailModalProps = {
  postId: string | null;
  onClose: () => void;
  onPostVoteUpdated?: (postId: string, voteScore: number) => void;
  onPostCommentCountDelta?: (postId: string, delta: number) => void;
  viewerUserId: string | null;
  isViewerAdmin?: boolean;
  onPostUpdated?: (post: ForumPost) => void;
  onPostDeleted?: (postId: string) => void;
};

export function ForumPostDetailModal({
  postId,
  onClose,
  onPostVoteUpdated,
  onPostCommentCountDelta,
  viewerUserId,
  isViewerAdmin = false,
  onPostUpdated,
  onPostDeleted,
}: ForumPostDetailModalProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { isLoggedIn } = useGlobalContext();

  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [commentMediaFile, setCommentMediaFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isPostEditing, setIsPostEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingPost, setSavingPost] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [commentPendingDelete, setCommentPendingDelete] =
    useState<ForumComment | null>(null);
  const [banTarget, setBanTarget] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [isBanningUser, setIsBanningUser] = useState(false);
  const [commentMediaError, setCommentMediaError] = useState<string | null>(
    null,
  );
  const [commentPreviewUrl, setCommentPreviewUrl] = useState<string | null>(
    null,
  );
  const [imageViewerIndex, setImageViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!commentMediaFile) {
      setCommentPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(commentMediaFile);
    setCommentPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [commentMediaFile]);

  const labels = useMemo(
    () => ({
      upvote: t('forum.feed.upvote'),
      downvote: t('forum.feed.downvote'),
      score: t('forum.feed.score'),
      comments: t('forum.feed.comments'),
      deletePost: t('forum.feed.deletePost'),
      banUser: t('forum.moderation.banUser'),
      postOptionsAria: t('forum.feed.postOptionsAria'),
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
      setCommentMediaFile(null);
      setCommentMediaError(null);
      setErrorCode(null);
      setIsPostEditing(false);
      return;
    }
    setIsPostEditing(false);
    void loadDetail();
  }, [loadDetail, postId]);

  const beginEditPost = useCallback(() => {
    if (!post) {
      return;
    }
    setEditTitle(post.title);
    setEditContent(post.content);
    setIsPostEditing(true);
    setErrorCode(null);
  }, [post]);

  const cancelEditPost = useCallback(() => {
    setIsPostEditing(false);
  }, []);

  const saveEditPost = useCallback(async () => {
    if (!postId || !post) {
      return;
    }
    setSavingPost(true);
    setErrorCode(null);
    try {
      const updated = await updatePost(postId, {
        title: editTitle.trim(),
        content: editContent,
      });
      setPost(updated);
      onPostUpdated?.(updated);
      setIsPostEditing(false);
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    } finally {
      setSavingPost(false);
    }
  }, [editContent, editTitle, onPostUpdated, post, postId]);

  const executeDeletePost = useCallback(async () => {
    if (!postId) {
      return;
    }
    setErrorCode(null);
    try {
      await archivePost(postId);
      setDeleteConfirmOpen(false);
      onPostDeleted?.(postId);
      onClose();
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    }
  }, [onClose, onPostDeleted, postId]);

  useEffect(() => {
    if (!postId) {
      setDeleteConfirmOpen(false);
      setCommentPendingDelete(null);
      setBanTarget(null);
    }
  }, [postId]);

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
      setCommentMediaError(null);
      let payloadContent = commentContent;

      if (commentMediaFile) {
        if (!FORUM_MEDIA_ALLOWED_TYPES.has(commentMediaFile.type)) {
          setCommentMediaError(t('forum.feed.mediaTypeInvalid'));
          return;
        }
        if (commentMediaFile.size > FORUM_MEDIA_MAX_SIZE_BYTES) {
          setCommentMediaError(t('forum.feed.mediaTooLarge', { maxMb: 15 }));
          return;
        }

        const uploaded = await uploadForumMedia(commentMediaFile);
        payloadContent = appendMediaToForumContent(commentContent, {
          url: uploaded.url,
          kind: resolveForumMediaKindFromMime(commentMediaFile.type),
        });
      }

      await createComment(postId, { content: payloadContent });
      setCommentContent('');
      setCommentMediaFile(null);
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

  const executeDeleteComment = useCallback(async () => {
    if (!commentPendingDelete) {
      return;
    }
    setErrorCode(null);
    try {
      await archiveComment(commentPendingDelete.id);
      setComments((previous) =>
        previous.filter((comment) => comment.id !== commentPendingDelete.id),
      );
      setPost((previous) =>
        previous
          ? {
              ...previous,
              commentCount: Math.max(0, previous.commentCount - 1),
            }
          : previous,
      );
      if (postId) {
        onPostCommentCountDelta?.(postId, -1);
      }
      setCommentPendingDelete(null);
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    }
  }, [commentPendingDelete, onPostCommentCountDelta, postId]);

  if (!postId) {
    return null;
  }

  const media = post ? extractFirstForumMedia(post.content) : null;
  const mediaList = post ? extractForumMediaList(post.content) : [];
  const imageMediaList = mediaList.filter((item) => item.kind === 'image');
  const videoMediaList = mediaList.filter((item) => item.kind === 'video');
  const postBodyText = post
    ? media
      ? stripAllForumMedia(post.content)
      : post.content
    : undefined;

  const isImageViewerOpen = imageViewerIndex !== null;
  const currentViewerImage =
    imageViewerIndex !== null ? imageMediaList[imageViewerIndex] : null;
  const goToPrevImage = () => {
    if (imageViewerIndex === null || imageMediaList.length === 0) {
      return;
    }
    setImageViewerIndex(
      (imageViewerIndex - 1 + imageMediaList.length) % imageMediaList.length,
    );
  };
  const goToNextImage = () => {
    if (imageViewerIndex === null || imageMediaList.length === 0) {
      return;
    }
    setImageViewerIndex((imageViewerIndex + 1) % imageMediaList.length);
  };

  return createPortal(
    <>
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
              className='min-w-0 flex-1 truncate font-mono text-xs font-bold tracking-[0.16em] text-(--text-muted) uppercase'
            >
              {t('forum.post.modalTitle')}
            </h2>
            <div className='flex shrink-0 items-center gap-1'>
              {!isLoading &&
              post &&
              viewerUserId &&
              (viewerUserId === post.author.id || isViewerAdmin) ? (
                <ForumPostActionsMenu
                  editLabel={t('forum.feed.editPost')}
                  deleteLabel={t('forum.feed.deletePost')}
                  banUserLabel={t('forum.moderation.banUser')}
                  optionsAriaLabel={t('forum.feed.postOptionsAria')}
                  onEdit={
                    viewerUserId === post.author.id ? beginEditPost : undefined
                  }
                  onDelete={() => setDeleteConfirmOpen(true)}
                  onBanUser={
                    isViewerAdmin && viewerUserId !== post.author.id
                      ? () =>
                          setBanTarget({
                            id: post.author.id,
                            username: post.author.username,
                          })
                      : undefined
                  }
                />
              ) : null}
              <Button
                type='button'
                variant='default'
                className='!flex !h-10 !min-h-10 !w-10 !min-w-10 shrink-0 items-center justify-center p-0'
                onClick={onClose}
              >
                <X className='h-5 w-5' aria-hidden />
              </Button>
            </div>
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
                {isPostEditing ? (
                  <div className='mt-3 grid gap-3'>
                    <input
                      className='ui-input h-11 w-full rounded-sm px-3'
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      disabled={savingPost}
                      required
                      placeholder={t('forum.feed.titlePlaceholder')}
                    />
                    <textarea
                      className='ui-input themed-scrollbar min-h-40 w-full rounded-sm px-3 py-2 sm:min-h-48'
                      value={editContent}
                      onChange={(event) => setEditContent(event.target.value)}
                      disabled={savingPost}
                      required
                      placeholder={t('forum.feed.contentPlaceholder')}
                    />
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        type='button'
                        variant='default'
                        className='h-10 w-auto px-5'
                        disabled={savingPost}
                        onClick={cancelEditPost}
                      >
                        {t('forum.post.editCancel')}
                      </Button>
                      <Button
                        type='button'
                        variant='primary'
                        className='h-10 w-auto min-w-[8rem] px-5'
                        disabled={savingPost}
                        onClick={() => void saveEditPost()}
                      >
                        {savingPost
                          ? t('forum.post.editSaving')
                          : t('forum.post.editSave')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className='mt-2 text-xl font-black uppercase tracking-[0.06em] text-(--text-main) sm:text-2xl'>
                      {post.title}
                    </h3>
                    {imageMediaList.length === 1 ? (
                      <img
                        src={imageMediaList[0].url}
                        alt=''
                        className='mt-3 max-h-[min(50vh,420px)] w-full rounded-md border border-(--border-main) object-contain'
                      />
                    ) : null}
                    {imageMediaList.length > 1 ? (
                      <div className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3'>
                        {imageMediaList.map((item, idx) => (
                          <button
                            key={`${item.url}-${idx}`}
                            type='button'
                            className='overflow-hidden rounded-md border border-(--border-main) bg-(--bg-card-soft)'
                            onClick={() => setImageViewerIndex(idx)}
                          >
                            <img
                              src={item.url}
                              alt=''
                              className='h-28 w-full object-cover sm:h-32'
                            />
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {videoMediaList.length > 0 ? (
                      <div className='mt-3 grid gap-2'>
                        {videoMediaList.map((item, idx) => (
                          <video
                            key={`${item.url}-${idx}`}
                            src={item.url}
                            className='max-h-[min(50vh,420px)] w-full rounded-md border border-(--border-main) object-contain'
                            controls
                            preload='metadata'
                          />
                        ))}
                      </div>
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
                        const el = document.getElementById(
                          'forum-post-comments-heading',
                        );
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    />
                  </>
                )}
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
                  <div className='flex flex-col gap-1'>
                    <p className='text-sm text-(--text-muted)'>
                      {isLoggedIn
                        ? t('forum.feed.loginStateReady')
                        : t('forum.feed.loginStateRequired')}
                    </p>
                    <p className='text-xs text-(--text-muted)'>
                      {t('forum.feed.mediaHint', { maxMb: 15 })}
                    </p>
                    {commentMediaError ? (
                      <p className='text-xs text-(--accent-danger)'>
                        {commentMediaError}
                      </p>
                    ) : null}
                  </div>
                  <div className='flex items-center gap-2'>
                    <label className='inline-flex cursor-pointer items-center gap-2 rounded-sm border border-(--border-main) px-3 py-2 text-xs font-bold tracking-[0.08em] uppercase'>
                      <span>{t('forum.feed.uploadMedia')}</span>
                      <input
                        type='file'
                        className='hidden'
                        accept='image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm'
                        disabled={!isLoggedIn || isSubmitting}
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setCommentMediaError(null);
                          setCommentMediaFile(file);
                          event.currentTarget.value = '';
                        }}
                      />
                    </label>
                    {commentMediaFile ? (
                      <button
                        type='button'
                        className='text-xs text-(--text-muted) hover:text-(--text-main)'
                        onClick={() => setCommentMediaFile(null)}
                      >
                        {t('forum.feed.removeMedia')}
                      </button>
                    ) : null}
                  </div>
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
                {commentMediaFile ? (
                  <div className='grid gap-2'>
                    <p className='text-xs text-(--text-muted)'>
                      {t('forum.feed.selectedMedia')}: {commentMediaFile.name}
                    </p>
                    {commentPreviewUrl ? (
                      commentMediaFile.type.startsWith('video/') ? (
                        <video
                          src={commentPreviewUrl}
                          className='max-h-56 w-full rounded border border-(--border-main) object-contain'
                          controls
                          preload='metadata'
                        />
                      ) : (
                        <img
                          src={commentPreviewUrl}
                          alt=''
                          className='max-h-56 w-full rounded border border-(--border-main) object-contain'
                        />
                      )
                    ) : null}
                  </div>
                ) : null}
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
                    canManageComment={Boolean(
                      viewerUserId &&
                        (viewerUserId === comment.author.id || isViewerAdmin),
                    )}
                    canBanCommentAuthor={
                      isViewerAdmin && viewerUserId !== comment.author.id
                    }
                    onDelete={() => setCommentPendingDelete(comment)}
                    onBanAuthor={() =>
                      setBanTarget({
                        id: comment.author.id,
                        username: comment.author.username,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title={t('forum.feed.deletePostDialogTitle')}
        message={t('forum.feed.deletePostConfirm')}
        cancelLabel={t('forum.post.editCancel')}
        confirmLabel={t('forum.feed.deletePost')}
        confirmVariant='danger'
        onConfirm={executeDeletePost}
      />

      <ConfirmDialog
        isOpen={commentPendingDelete !== null}
        onClose={() => setCommentPendingDelete(null)}
        title={t('forum.moderation.deleteCommentDialogTitle')}
        message={t('forum.moderation.deleteCommentConfirm')}
        cancelLabel={t('forum.post.editCancel')}
        confirmLabel={t('forum.feed.deletePost')}
        confirmVariant='danger'
        onConfirm={executeDeleteComment}
      />

      <BanUserModal
        isOpen={banTarget !== null}
        username={banTarget?.username ?? null}
        isSubmitting={isBanningUser}
        onClose={() => setBanTarget(null)}
        onSubmit={async (payload) => {
          if (!banTarget) {
            return;
          }
          setErrorCode(null);
          setIsBanningUser(true);
          try {
            await banUser(banTarget.id, payload);
            setBanTarget(null);
          } catch (error) {
            setErrorCode(getApiErrorCode(error));
          } finally {
            setIsBanningUser(false);
          }
        }}
      />

      {isImageViewerOpen && currentViewerImage ? (
        <div
          className='fixed inset-0 z-[230] flex items-center justify-center bg-[rgba(0,0,0,0.86)] p-3 sm:p-6'
          role='dialog'
          aria-modal='true'
          onClick={() => setImageViewerIndex(null)}
        >
          <div
            className='relative flex h-full w-full max-w-6xl items-center justify-center'
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type='button'
              className='absolute top-0 right-0 z-10 inline-flex h-10 w-10 items-center justify-center rounded-md border border-(--border-main) bg-(--bg-card-soft) text-(--text-main)'
              onClick={() => setImageViewerIndex(null)}
            >
              <X className='h-5 w-5' aria-hidden />
            </button>
            {imageMediaList.length > 1 ? (
              <>
                <button
                  type='button'
                  className='absolute left-0 z-10 inline-flex h-10 w-10 items-center justify-center rounded-md border border-(--border-main) bg-(--bg-card-soft) text-(--text-main)'
                  onClick={goToPrevImage}
                >
                  <ChevronLeft className='h-5 w-5' aria-hidden />
                </button>
                <button
                  type='button'
                  className='absolute right-0 z-10 inline-flex h-10 w-10 items-center justify-center rounded-md border border-(--border-main) bg-(--bg-card-soft) text-(--text-main)'
                  onClick={goToNextImage}
                >
                  <ChevronRight className='h-5 w-5' aria-hidden />
                </button>
              </>
            ) : null}
            <img
              src={currentViewerImage.url}
              alt=''
              className='max-h-full max-w-full rounded-md object-contain'
            />
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
}
