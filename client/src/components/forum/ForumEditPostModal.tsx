import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { updatePost } from '@/services/forumService';
import { getApiErrorCode } from '@/services/httpError';
import type { ForumPost } from '@/types/forum';

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
  const [saving, setSaving] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (!post) {
      return;
    }
    setTitle(post.title);
    setContent(post.content);
    setErrorCode(null);
  }, [post]);

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
    try {
      const updated = await updatePost(post.id, { title: title.trim(), content });
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
