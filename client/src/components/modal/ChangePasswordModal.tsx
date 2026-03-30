import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import * as authService from '@/services/authService';
import {
  getApiErrorCode,
  isGloballyHandledApiError,
} from '@/services/httpError';
import { validateChangePasswordInput } from '@/utils/authValidation';

type ChangePasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: authService.UpdateProfileResponse['user']) => void;
};

const inputClassName = 'ui-input h-11 rounded-sm px-3';

export function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const { t } = useTranslation('common');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = validateChangePasswordInput(
      currentPassword,
      newPassword,
      confirmPassword,
    );

    if (validation.errorCode) {
      setErrorMessage(t(`errors.${validation.errorCode}`));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.changePassword({
        currentPassword: validation.currentPassword,
        newPassword: validation.newPassword,
      });
      onSuccess(response.user);
      resetFields();
      onClose();
    } catch (error) {
      if (isGloballyHandledApiError(error)) {
        return;
      }
      setErrorMessage(t(`errors.${getApiErrorCode(error)}`));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={t('welcome.modals.changePasswordTitle')}
      onClose={handleClose}
    >
      <form className='grid gap-4' noValidate onSubmit={handleSubmit}>
        <label className='grid gap-2 text-sm font-semibold text-(--text-muted)'>
          {t('welcome.modals.changePasswordCurrent')}
          <input
            type='password'
            name='current-password'
            autoComplete='current-password'
            value={currentPassword}
            onChange={(ev) => {
              setErrorMessage(null);
              setCurrentPassword(ev.target.value);
            }}
            className={inputClassName}
          />
        </label>

        <label className='grid gap-2 text-sm font-semibold text-(--text-muted)'>
          {t('welcome.modals.changePasswordNew')}
          <input
            type='password'
            name='new-password'
            autoComplete='new-password'
            value={newPassword}
            onChange={(ev) => {
              setErrorMessage(null);
              setNewPassword(ev.target.value);
            }}
            minLength={8}
            maxLength={72}
            className={inputClassName}
          />
        </label>

        <label className='grid gap-2 text-sm font-semibold text-(--text-muted)'>
          {t('welcome.modals.changePasswordConfirm')}
          <input
            type='password'
            name='confirm-new-password'
            autoComplete='new-password'
            value={confirmPassword}
            onChange={(ev) => {
              setErrorMessage(null);
              setConfirmPassword(ev.target.value);
            }}
            minLength={8}
            maxLength={72}
            className={inputClassName}
          />
        </label>

        {errorMessage && (
          <p className='rounded-sm border border-[#8d3f47] bg-[#2b1016] px-3 py-2 text-sm font-semibold text-[#ffb4b4]'>
            {errorMessage}
          </p>
        )}

        <div className='mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <Button
            type='button'
            className='h-11 sm:min-w-[7rem]'
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t('welcome.modals.cancel')}
          </Button>
          <Button
            variant='primary'
            type='submit'
            className='h-11 sm:min-w-[7rem]'
            disabled={isSubmitting}
          >
            {t('welcome.modals.changePasswordSubmit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
