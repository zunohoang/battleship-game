import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

type ModalProps = {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
};

export function Modal({ isOpen, title, onClose, children }: ModalProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className='ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4'
          role='dialog'
          aria-modal='true'
          aria-labelledby='modal-title'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className='ui-modal-surface w-full max-w-md rounded-md p-5 shadow-2xl'
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.985 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className='relative z-10 flex items-center justify-between gap-4'>
              <div>
                <p className='ui-title-eyebrow'>{t('modal.secureChannel')}</p>
                <h2 id='modal-title' className='mt-2 text-xl font-black uppercase tracking-[0.08em] text-(--text-main)'>
                  {title}
                </h2>
              </div>
              <button
                type='button'
                aria-label={t('modal.close')}
                onClick={onClose}
                className='ui-button-shell ui-button-default cursor-pointer rounded-sm border px-3 py-1.5 text-sm font-semibold'
              >
                                ×
              </button>
            </div>

            <div className='relative z-10 mt-4'>{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
