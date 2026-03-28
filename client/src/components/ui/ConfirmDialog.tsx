import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';

export type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Shown as the main heading */
  title: string;
  /** Supporting text (can include line breaks via JSX) */
  message: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  /** Destructive actions should use "danger" */
  confirmVariant?: 'primary' | 'danger';
  /**
   * Called when the user confirms. If it returns a Promise, the dialog shows
   * a submitting state until the promise settles (success or error).
   */
  onConfirm: () => void | Promise<void>;
};

/**
 * Reusable confirmation modal (portal, above most HUD layers).
 * Use for delete flows, irreversible actions, etc.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
}: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isSubmitting) {
        return;
      }
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, isSubmitting, onClose]);

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await Promise.resolve(onConfirm());
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, onConfirm]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className='ui-modal-overlay fixed inset-0 z-[280] flex items-center justify-center p-4'
      role='presentation'
      onClick={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className='ui-modal-surface relative z-10 w-full max-w-md rounded-lg border border-(--panel-stroke) p-5 shadow-[var(--hud-shadow-strong)]'
        role='alertdialog'
        aria-modal='true'
        aria-labelledby='confirm-dialog-title'
        aria-describedby='confirm-dialog-message'
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id='confirm-dialog-title'
          className='text-lg font-black uppercase tracking-[0.06em] text-(--text-main)'
        >
          {title}
        </h2>
        <div
          id='confirm-dialog-message'
          className='mt-3 text-sm leading-relaxed text-(--text-muted)'
        >
          {message}
        </div>
        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <Button
            type='button'
            variant='default'
            className='h-10 w-full sm:w-auto sm:min-w-[7rem]'
            disabled={isSubmitting}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            type='button'
            variant={confirmVariant}
            className='h-10 w-full sm:w-auto sm:min-w-[7rem]'
            disabled={isSubmitting}
            onClick={() => void handleConfirm()}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
