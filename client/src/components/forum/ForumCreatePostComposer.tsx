import { useEffect, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Maximize2, Minimize2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export type ForumCreatePostComposerLabels = {
  sectionTitle: string;
  titlePlaceholder: string;
  contentPlaceholder: string;
  loginStateReady: string;
  loginStateRequired: string;
  creating: string;
  publish: string;
  collapsedHint: string;
  openFullscreen: string;
  collapseComposer: string;
  closeFullscreen: string;
};

type ForumCreatePostComposerProps = {
  labels: ForumCreatePostComposerLabels;
  isLoggedIn: boolean;
  title: string;
  content: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  isCreating: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  expanded: boolean;
  fullscreen: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onOpenFullscreen: () => void;
  onCloseFullscreen: () => void;
};

function ComposerFormFields({
  labels,
  isLoggedIn,
  title,
  content,
  onTitleChange,
  onContentChange,
  isCreating,
  showSubmitButton = true,
  footerEndSlot,
}: {
  labels: ForumCreatePostComposerLabels;
  isLoggedIn: boolean;
  title: string;
  content: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  isCreating: boolean;
  showSubmitButton?: boolean;
  footerEndSlot?: ReactNode;
}) {
  return (
    <>
      <input
        className="ui-input h-11 w-full rounded-sm px-3"
        type="text"
        placeholder={labels.titlePlaceholder}
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        disabled={!isLoggedIn || isCreating}
        required
      />
      <textarea
        className="ui-input themed-scrollbar min-h-32 w-full rounded-sm px-3 py-2 sm:min-h-40"
        placeholder={labels.contentPlaceholder}
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
        disabled={!isLoggedIn || isCreating}
        required
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-(--text-muted)">
          {isLoggedIn ? labels.loginStateReady : labels.loginStateRequired}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {footerEndSlot}
          {showSubmitButton ? (
            <Button
              type="submit"
              variant="primary"
              className="h-10 w-auto min-w-[8rem] px-5"
              disabled={!isLoggedIn || isCreating}
            >
              {isCreating ? labels.creating : labels.publish}
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function ForumCreatePostComposer({
  labels,
  isLoggedIn,
  title,
  content,
  onTitleChange,
  onContentChange,
  isCreating,
  onSubmit,
  expanded,
  fullscreen,
  onExpand,
  onCollapse,
  onOpenFullscreen,
  onCloseFullscreen,
}: ForumCreatePostComposerProps) {
  useEffect(() => {
    if (!fullscreen) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [fullscreen, onCloseFullscreen]);

  const iconSquareButtonClass =
    '!flex !h-11 !min-h-11 !w-11 !min-w-11 shrink-0 items-center justify-center p-0';

  const fullscreenOverlay =
    fullscreen &&
    createPortal(
      <div
        className="forum-composer-fullscreen-backdrop fixed inset-0 z-200 flex items-start justify-center overflow-y-auto p-3 sm:p-6 sm:pt-10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forum-composer-fullscreen-title"
      >
        <div
          className="forum-composer-fullscreen-panel themed-scrollbar my-auto flex w-full max-h-[min(92vh,880px)] max-w-[min(42rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg sm:max-w-[min(48rem,calc(100vw-2rem))]"
          style={{ minHeight: 'min(60vh, 520px)' }}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-(--border-main) bg-(--bg-card-soft) px-4 py-3 sm:px-5">
            <h2
              id="forum-composer-fullscreen-title"
              className="font-mono text-xs font-bold tracking-[0.16em] text-(--text-muted) uppercase"
            >
              {labels.sectionTitle}
            </h2>
            <Button
              type="button"
              variant="default"
              className={iconSquareButtonClass}
              title={labels.closeFullscreen}
              onClick={onCloseFullscreen}
            >
              <X className="h-5 w-5" aria-hidden />
            </Button>
          </div>
          <form
            className="themed-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:gap-4 sm:p-5"
            onSubmit={onSubmit}
          >
            <ComposerFormFields
              labels={labels}
              isLoggedIn={isLoggedIn}
              title={title}
              content={content}
              onTitleChange={onTitleChange}
              onContentChange={onContentChange}
              isCreating={isCreating}
              showSubmitButton={false}
              footerEndSlot={
                <Button
                  type="button"
                  variant="default"
                  className="h-10 gap-2 px-4"
                  title={labels.collapseComposer}
                  onClick={onCloseFullscreen}
                >
                  <Minimize2 className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="text-[10px] font-bold tracking-[0.14em] uppercase">
                    {labels.collapseComposer}
                  </span>
                </Button>
              }
            />
            <div className="mt-auto shrink-0 border-t border-(--border-main) bg-(--bg-card-soft) pt-4 sm:pt-5">
              <Button
                type="submit"
                variant="primary"
                className="h-12 w-full"
                disabled={!isLoggedIn || isCreating}
              >
                {isCreating ? labels.creating : labels.publish}
              </Button>
            </div>
          </form>
        </div>
      </div>,
      document.body,
    );

  const minimized = !expanded && !fullscreen;

  return (
    <>
      {fullscreenOverlay}

      {!fullscreen ? (
        <section className="ui-panel rounded-lg border border-(--panel-stroke) px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-mono text-xs font-bold tracking-[0.16em] text-(--text-muted) uppercase">
              {labels.sectionTitle}
            </h2>
            {!minimized ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="cursor-pointer rounded-md p-2 text-(--text-muted) transition-colors hover:bg-(--accent-soft) hover:text-(--text-main)"
                  title={labels.collapseComposer}
                  onClick={onCollapse}
                >
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
                <Button
                  type="button"
                  variant="default"
                  className={iconSquareButtonClass}
                  title={labels.openFullscreen}
                  onClick={onOpenFullscreen}
                >
                  <Maximize2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ) : null}
          </div>

          {minimized ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="ui-input flex min-h-11 flex-1 cursor-pointer items-center rounded-sm px-3 text-left text-sm text-(--text-muted) transition-colors hover:border-(--border-strong)"
                onClick={onExpand}
              >
                {labels.collapsedHint}
              </button>
              <Button
                type="button"
                variant="primary"
                className={iconSquareButtonClass}
                title={labels.openFullscreen}
                onClick={onOpenFullscreen}
              >
                <Maximize2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ) : (
            <form className="mt-3 grid gap-3" onSubmit={onSubmit}>
              <ComposerFormFields
                labels={labels}
                isLoggedIn={isLoggedIn}
                title={title}
                content={content}
                onTitleChange={onTitleChange}
                onContentChange={onContentChange}
                isCreating={isCreating}
              />
            </form>
          )}
        </section>
      ) : null}
    </>
  );
}
