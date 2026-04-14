import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, UserX } from 'lucide-react';

type ForumPostActionsMenuProps = {
  editLabel?: string;
  deleteLabel: string;
  banUserLabel?: string;
  optionsAriaLabel: string;
  onEdit?: () => void;
  onDelete: () => void;
  onBanUser?: () => void;
};

export function ForumPostActionsMenu({
  editLabel,
  deleteLabel,
  banUserLabel,
  optionsAriaLabel,
  onEdit,
  onDelete,
  onBanUser,
}: ForumPostActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocMouseDown = (event: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  return (
    <div className='relative shrink-0' ref={rootRef}>
      <button
        type='button'
        className='shrink-0 cursor-pointer rounded-md p-1.5 text-(--text-muted) transition-colors hover:bg-(--accent-soft) hover:text-(--text-main)'
        aria-expanded={open}
        aria-haspopup='menu'
        aria-label={optionsAriaLabel}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((previous) => !previous);
        }}
      >
        <MoreHorizontal className='h-4 w-4' aria-hidden />
      </button>
      {open ? (
        <div
          role='menu'
          className='absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-md border border-(--border-main) bg-(--panel-bg) py-1 shadow-[var(--hud-shadow)]'
        >
          {onEdit && editLabel ? (
            <button
              type='button'
              role='menuitem'
              className='flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold tracking-wide text-(--text-main) uppercase transition-colors hover:bg-(--accent-soft)'
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                onEdit();
              }}
            >
              <Pencil className='h-3.5 w-3.5 shrink-0' aria-hidden />
              {editLabel}
            </button>
          ) : null}
          <button
            type='button'
            role='menuitem'
            className='flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold tracking-wide text-(--accent-danger) uppercase transition-colors hover:bg-[rgba(255,90,90,0.12)]'
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className='h-3.5 w-3.5 shrink-0' aria-hidden />
            {deleteLabel}
          </button>
          {onBanUser && banUserLabel ? (
            <button
              type='button'
              role='menuitem'
              className='flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold tracking-wide text-(--accent-danger) uppercase transition-colors hover:bg-[rgba(255,90,90,0.12)]'
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                onBanUser();
              }}
            >
              <UserX className='h-3.5 w-3.5 shrink-0' aria-hidden />
              {banUserLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
