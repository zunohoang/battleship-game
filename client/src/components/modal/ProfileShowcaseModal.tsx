import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';

type ProfileShowcaseData = {
  id?: string | null;
  username: string;
  signature?: string | null;
  avatar?: string | null;
  label?: string;
};

type ProfileShowcaseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  profile: ProfileShowcaseData | null;
};

export function ProfileShowcaseModal({
  isOpen,
  onClose,
  title = 'Profile Showcase',
  profile,
}: ProfileShowcaseModalProps) {
  const { t } = useTranslation('common');

  const avatarInitial = useMemo(
    () => profile?.username.trim().slice(0, 1).toUpperCase() || '?',
    [profile?.username],
  );

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      surfaceClassName='max-w-2xl'
    >
      {profile ? (
        <div className='grid gap-4'>
          <div className='ui-subpanel rounded-md px-5 py-5'>
            <div className='grid gap-4 text-center sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-start sm:text-left'>
              <div className='flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border-strong) bg-(--accent-soft) font-mono text-4xl font-black text-(--accent-secondary) shadow-[0_0_22px_rgba(34,211,238,0.18)]'>
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.username}
                    className='h-full w-full object-cover'
                  />
                ) : (
                  avatarInitial
                )}
              </div>

              <div className='min-w-0 flex-1'>
                <p className='ui-data-label'>{profile.label ?? 'Commander Profile'}</p>
                <p className='mt-2 wrap-anywhere font-mono text-2xl font-black tracking-[0.08em] text-(--text-main)'>
                  {profile.username}
                </p>
              </div>
            </div>
          </div>

          <div className='ui-subpanel rounded-sm px-4 py-4'>
            <p className='ui-data-label'>{t('home.profile.signature')}</p>
            <p className='mt-2 wrap-anywhere text-sm leading-6 text-(--text-main)'>
              {profile.signature?.trim() || '- - -'}
            </p>
          </div>
        </div>
      ) : (
        <p className='text-sm text-(--text-muted)'>
          Profile data is unavailable right now.
        </p>
      )}
    </Modal>
  );
}
