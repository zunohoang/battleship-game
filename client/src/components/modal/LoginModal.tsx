import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onForgotPassword: () => void;
  onFieldsChange?: () => void;
  errorMessage?: string;
};

export function LoginModal({
  isOpen,
  onClose,
  onSubmit,
  onForgotPassword,
  onFieldsChange,
  errorMessage,
}: LoginModalProps) {
  const { t } = useTranslation('common');

  return (
    <Modal
      isOpen={isOpen}
      title={t('welcome.modals.loginTitle')}
      onClose={onClose}
    >
      <form
        className='grid gap-4'
        noValidate
        onSubmit={onSubmit}
        onChange={onFieldsChange}
      >
        <label className='grid gap-2 text-sm font-semibold text-(--text-muted)'>
          {t('welcome.modals.email')}
          <input
            type='email'
            name='email'
            required
            className='ui-input h-11 rounded-sm px-3'
          />
        </label>

        <label className='grid gap-2 text-sm font-semibold text-(--text-muted)'>
          {t('welcome.modals.password')}
          <input
            type='password'
            name='password'
            required
            minLength={8}
            maxLength={72}
            className='ui-input h-11 rounded-sm px-3'
          />
        </label>

        <button
          type='button'
          onClick={onForgotPassword}
          className='justify-self-start text-sm font-semibold text-(--accent-secondary) underline underline-offset-4 hover:text-white'
        >
          {t('welcome.modals.forgotPassword')}
        </button>

        {errorMessage && (
          <p className='rounded-sm border border-[#8d3f47] bg-[#2b1016] px-3 py-2 text-sm font-semibold text-[#ffb4b4]'>
            {errorMessage}
          </p>
        )}

        <div className='mt-2 flex gap-3'>
          <Button variant='primary' type='submit' className='h-11'>
            {t('welcome.modals.submitLogin')}
          </Button>
          <Button type='button' className='h-11' onClick={onClose}>
            {t('welcome.modals.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
