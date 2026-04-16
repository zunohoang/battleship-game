import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { updatePost, uploadForumMedia } from '@/services/forumService';
import { getApiErrorCode } from '@/services/httpError';
import type { ForumPost } from '@/types/forum';
import {
  appendMediaToForumContent,
  extractForumMediaList,
  resolveForumMediaKindFromMime,
  stripAllForumMedia,
  type ForumMedia,
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

type ForumEditPostModalProps = {
  post: ForumPost | null;
  onClose: () => void;
  onSaved: (updated: ForumPost) => void;
};

export function ForumEditPostModal({
  post,
  onClose,
  onSaved,
}: ForumEditPostModalProps) {
  const { t } = useTranslation('common');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [existingMedia, setExistingMedia] = useState<ForumMedia[]>([]);
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [newMediaPreviewUrls, setNewMediaPreviewUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    if (!post) {
      return;
    }
    setTitle(post.title);
    setContent(stripAllForumMedia(post.content));
    setExistingMedia(extractForumMediaList(post.content));
    setNewMediaFiles([]);
    setNewMediaPreviewUrls([]);
    setErrorCode(null);
    setMediaError(null);
  }, [post]);

  useEffect(() => {
    if (newMediaFiles.length === 0) {
      setNewMediaPreviewUrls([]);
      return;
    }
    const urls = newMediaFiles.map((file) => URL.createObjectURL(file));
    setNewMediaPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [newMediaFiles]);

  useEffect(() => {
    if (!post) {
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
  }, [post, onClose]);

  if (!post) {
    return null;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setErrorCode(null);
    setMediaError(null);
    try {
      for (const file of newMediaFiles) {
        if (!FORUM_MEDIA_ALLOWED_TYPES.has(file.type)) {
          setMediaError(t('forum.feed.mediaTypeInvalid'));
          return;
        }
        if (file.size > FORUM_MEDIA_MAX_SIZE_BYTES) {
          setMediaError(t('forum.feed.mediaTooLarge', { maxMb: 15 }));
          return;
        }
      }

      const uploadedMedia: ForumMedia[] = [];
      for (const file of newMediaFiles) {
        const uploaded = await uploadForumMedia(file);
        uploadedMedia.push({
          url: uploaded.url,
          kind: resolveForumMediaKindFromMime(file.type),
        });
      }

      let payloadContent = content.trim();
      for (const media of [...existingMedia, ...uploadedMedia]) {
        payloadContent = appendMediaToForumContent(payloadContent, media);
      }

      const updated = await updatePost(post.id, {
        title: title.trim(),
        content: payloadContent,
      });
      onSaved(updated);
      onClose();
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className='forum-composer-fullscreen-backdrop fixed inset-0 z-[220] flex items-start justify-center overflow-y-auto p-3 sm:p-6 sm:pt-10'
      role='dialog'
      aria-modal='true'
      aria-labelledby='forum-edit-post-title'
      onClick={onClose}
    >
      <div
        className='forum-composer-fullscreen-panel themed-scrollbar my-auto flex w-full max-h-[min(92vh,880px)] max-w-[min(42rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg sm:max-w-[min(48rem,calc(100vw-2rem))]'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='flex shrink-0 items-center justify-between gap-3 border-b border-(--border-main) bg-(--bg-card-soft) px-4 py-3 sm:px-5'>
          <h2
            id='forum-edit-post-title'
            className='font-mono text-xs font-bold tracking-[0.16em] text-(--text-muted) uppercase'
          >
            {t('forum.post.editTitle')}
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
        <form
          className='themed-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:gap-4 sm:p-5'
          onSubmit={submit}
        >
          {errorCode ? (
            <div className='rounded-sm border border-(--accent-danger) bg-[rgba(255,90,90,0.14)] px-3 py-2 text-sm font-semibold text-(--text-main)'>
              {t(`errors.${errorCode}`)}
            </div>
          ) : null}
          {mediaError ? (
            <div className='rounded-sm border border-(--accent-danger) bg-[rgba(255,90,90,0.14)] px-3 py-2 text-sm font-semibold text-(--text-main)'>
              {mediaError}
            </div>
          ) : null}
          <input
            className='ui-input h-11 w-full rounded-sm px-3'
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={saving}
            required
            placeholder={t('forum.feed.titlePlaceholder')}
          />
          <textarea
            className='ui-input themed-scrollbar min-h-40 w-full rounded-sm px-3 py-2 sm:min-h-48'
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={saving}
            required
            placeholder={t('forum.feed.contentPlaceholder')}
          />
          <div className='grid gap-2 rounded-md border border-(--border-main) bg-(--bg-card-soft) p-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <p className='text-xs text-(--text-muted)'>
                {t('forum.feed.mediaHint', { maxMb: 15 })}
              </p>
              <label className='inline-flex cursor-pointer items-center gap-2 rounded-sm border border-(--border-main) px-3 py-2 text-xs font-bold tracking-[0.08em] uppercase'>
                <Paperclip className='h-4 w-4' aria-hidden />
                <span>{t('forum.feed.uploadMedia')}</span>
                <input
                  type='file'
                  multiple
                  className='hidden'
                  accept='image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm'
                  disabled={saving}
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    setMediaError(null);
                    if (files.length > 0) {
                      setNewMediaFiles((prev) => [...prev, ...files]);
                    }
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            </div>

            {existingMedia.length > 0 ? (
              <div className='grid gap-2'>
                {existingMedia.map((media, index) => (
                  <div
                    key={`${media.url}-${index}`}
                    className='rounded border border-(--border-main) bg-(--bg-card) p-2'
                  >
                    <div className='mb-2 flex items-center justify-end'>
                      <button
                        type='button'
                        className='text-xs text-(--text-muted) hover:text-(--text-main)'
                        onClick={() =>
                          setExistingMedia((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      >
                        {t('forum.feed.removeMedia')}
                      </button>
                    </div>
                    {media.kind === 'video' ? (
                      <video
                        src={media.url}
                        className='max-h-64 w-full rounded object-contain'
                        controls
                        preload='metadata'
                      />
                    ) : (
                      <img
                        src={media.url}
                        alt=''
                        className='max-h-64 w-full rounded object-contain'
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {newMediaFiles.length > 0 ? (
              <div className='grid gap-2'>
                {newMediaFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className='rounded border border-(--border-main) bg-(--bg-card) p-2'
                  >
                    <div className='mb-2 flex items-center justify-between gap-2 text-xs'>
                      <span className='truncate text-(--text-muted)'>
                        {t('forum.feed.selectedMedia')}: {file.name}
                      </span>
                      <button
                        type='button'
                        className='text-(--text-muted) hover:text-(--text-main)'
                        onClick={() =>
                          setNewMediaFiles((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        {t('forum.feed.removeMedia')}
                      </button>
                    </div>
                    {newMediaPreviewUrls[index] ? (
                      file.type.startsWith('video/') ? (
                        <video
                          src={newMediaPreviewUrls[index]}
                          className='max-h-64 w-full rounded object-contain'
                          controls
                          preload='metadata'
                        />
                      ) : (
                        <img
                          src={newMediaPreviewUrls[index]}
                          alt=''
                          className='max-h-64 w-full rounded object-contain'
                        />
                      )
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className='flex flex-wrap justify-end gap-2 border-t border-(--border-main) bg-(--bg-card-soft) pt-4'>
            <Button
              type='button'
              variant='default'
              className='h-10 w-auto px-5'
              disabled={saving}
              onClick={onClose}
            >
              {t('forum.post.editCancel')}
            </Button>
            <Button
              type='submit'
              variant='primary'
              className='h-10 w-auto min-w-[8rem] px-5'
              disabled={saving}
            >
              {saving ? t('forum.post.editSaving') : t('forum.post.editSave')}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
