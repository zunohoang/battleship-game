import type { FormEvent } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export type ForumSortMode = 'newest' | 'top' | 'comments';

type ForumFeedSidebarProps = {
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent) => void;
  sort: ForumSortMode;
  onSortChange: (sort: ForumSortMode) => void;
  labels: {
    searchEyebrow: string;
    searchPlaceholder: string;
    searchSubmit: string;
    filtersTitle: string;
    sortNewest: string;
    sortTop: string;
    sortComments: string;
  };
};

export function ForumFeedSidebar({
  searchDraft,
  onSearchDraftChange,
  onSearchSubmit,
  sort,
  onSortChange,
  labels,
}: ForumFeedSidebarProps) {
  return (
    <aside className='flex w-full min-w-0 shrink-0 flex-col gap-4 lg:h-full lg:min-h-0 lg:max-h-full lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1 lg:pt-0 themed-scrollbar'>
      <form
        className='ui-panel rounded-lg border border-(--panel-stroke) p-4 shadow-[var(--hud-shadow)]'
        onSubmit={onSearchSubmit}
      >
        <p className='font-mono text-[10px] font-bold tracking-[0.18em] text-(--text-muted) uppercase'>
          {labels.searchEyebrow}
        </p>
        <div className='mt-3 flex min-w-0 items-center gap-2'>
          <label className='sr-only' htmlFor='forum-feed-search'>
            {labels.searchPlaceholder}
          </label>
          <input
            id='forum-feed-search'
            className='ui-input h-10 min-h-0 min-w-0 flex-1 rounded-sm px-3 py-0 text-sm leading-normal'
            type='search'
            placeholder={labels.searchPlaceholder}
            value={searchDraft}
            onChange={(event) => onSearchDraftChange(event.target.value)}
            autoComplete='off'
          />
          <Button
            type='submit'
            variant='primary'
            className='!h-10 !w-10 !min-w-10 !max-w-10 shrink-0 !p-0 !px-0 !py-0 inline-flex items-center justify-center'
            aria-label={labels.searchSubmit}
          >
            <Search className='h-4 w-4 shrink-0' aria-hidden />
          </Button>
        </div>
      </form>

      <div className='ui-panel rounded-lg border border-(--panel-stroke) p-4 shadow-[var(--hud-shadow)]'>
        <p className='font-mono text-[10px] font-bold tracking-[0.18em] text-(--text-muted) uppercase'>
          {labels.filtersTitle}
        </p>
        <div className='mt-3 flex flex-col gap-2'>
          <Button
            type='button'
            variant={sort === 'newest' ? 'primary' : 'default'}
            className='!h-10 justify-start px-4 text-left text-xs'
            onClick={() => onSortChange('newest')}
          >
            {labels.sortNewest}
          </Button>
          <Button
            type='button'
            variant={sort === 'top' ? 'primary' : 'default'}
            className='!h-10 justify-start px-4 text-left text-xs'
            onClick={() => onSortChange('top')}
          >
            {labels.sortTop}
          </Button>
          <Button
            type='button'
            variant={sort === 'comments' ? 'primary' : 'default'}
            className='!h-10 justify-start px-4 text-left text-xs'
            onClick={() => onSortChange('comments')}
          >
            {labels.sortComments}
          </Button>
        </div>
      </div>
    </aside>
  );
}
