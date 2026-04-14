import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { BanUserPayload } from '@/services/forumService';

type BanUserModalProps = {
  isOpen: boolean;
  username: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: BanUserPayload) => Promise<void>;
};

export function BanUserModal({
  isOpen,
  username,
  isSubmitting,
  onClose,
  onSubmit,
}: BanUserModalProps) {
  const { t } = useTranslation('common');
  const [mode, setMode] = useState<'temporary' | 'permanent'>('temporary');
  const [days, setDays] = useState('7');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setMode('temporary');
    setDays('7');
    setReason('');
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('forum.moderation.banTitle')}>
      <form
        className='grid gap-3'
        onSubmit={async (event) => {
          event.preventDefault();
          if (mode === 'temporary') {
            const parsedDays = Number.parseInt(days, 10);
            if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
              return;
            }
            await onSubmit({
              type: 'temporary',
              days: parsedDays,
              reason: reason.trim() || undefined,
            });
            return;
          }
          await onSubmit({
            type: 'permanent',
            reason: reason.trim() || undefined,
          });
        }}
      >
        <p className='text-sm text-(--text-muted)'>
          {t('forum.moderation.banTarget', { username: username ?? '-' })}
        </p>
        <div className='grid gap-2 sm:grid-cols-2'>
          <button
            type='button'
            className={`ui-button-shell rounded-sm border px-3 py-2 text-sm font-semibold ${mode === 'temporary' ? 'ui-button-primary' : 'ui-button-default'}`}
            onClick={() => setMode('temporary')}
            disabled={isSubmitting}
          >
            {t('forum.moderation.banTemporary')}
          </button>
          <button
            type='button'
            className={`ui-button-shell rounded-sm border px-3 py-2 text-sm font-semibold ${mode === 'permanent' ? 'ui-button-primary' : 'ui-button-default'}`}
            onClick={() => setMode('permanent')}
            disabled={isSubmitting}
          >
            {t('forum.moderation.banPermanent')}
          </button>
        </div>

        {mode === 'temporary' ? (
          <label className='grid gap-1 text-sm text-(--text-main)'>
            <span>{t('forum.moderation.banDaysLabel')}</span>
            <input
              type='number'
              min={1}
              max={3650}
              className='ui-input h-11 rounded-sm px-3'
              value={days}
              onChange={(event) => setDays(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </label>
        ) : null}

        <label className='grid gap-1 text-sm text-(--text-main)'>
          <span>{t('forum.moderation.banReasonLabel')}</span>
          <textarea
            className='ui-input themed-scrollbar min-h-20 rounded-sm px-3 py-2'
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={isSubmitting}
            placeholder={t('forum.moderation.banReasonPlaceholder')}
          />
        </label>

        <div className='mt-1 flex flex-wrap justify-end gap-2'>
          <Button
            type='button'
            variant='default'
            className='h-10 w-auto px-5'
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('forum.post.editCancel')}
          </Button>
          <Button
            type='submit'
            variant='danger'
            className='h-10 w-auto min-w-[8rem] px-5'
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t('forum.moderation.banning')
              : t('forum.moderation.banConfirm')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
