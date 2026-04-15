import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { STATUS_BADGE_CLASS } from './adminUtils';

export function AdminStatusBadge({ value }: { value: string }) {
  return (
    <span className={STATUS_BADGE_CLASS[value] ?? 'text-(--text-main)'}>
      {value}
    </span>
  );
}

export function PaginationBar({
  page,
  limit,
  total,
  onPageChange,
}: {
  page: number;
  limit: number;
  total: number;
  onPageChange: (nextPage: number) => void;
}) {
  const { t } = useTranslation('common');
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className='mt-3 flex items-center justify-between gap-2'>
      <p className='text-xs text-(--text-muted)'>
        {t('adminDashboard.pagination.summary', { page, totalPages, total })}
      </p>
      <div className='flex gap-2'>
        <Button
          variant='default'
          className='h-9 w-auto px-3'
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          {t('adminDashboard.pagination.prev')}
        </Button>
        <Button
          variant='default'
          className='h-9 w-auto px-3'
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          {t('adminDashboard.pagination.next')}
        </Button>
      </div>
    </div>
  );
}

export function TableShell({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: Array<Array<string | number | ReactNode>>;
}) {
  const { t } = useTranslation('common');
  return (
    <div className='ui-subpanel rounded-sm p-3 sm:p-4'>
      <p className='ui-panel-title'>{title}</p>
      <div className='themed-scrollbar mt-3 overflow-x-auto'>
        <table className='w-full min-w-[880px] border-collapse text-left text-sm'>
          <thead>
            <tr className='border-b border-(--border-main)'>
              {headers.map((header) => (
                <th
                  key={header}
                  className='px-2 py-2 font-mono text-xs tracking-[0.12em] uppercase'
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className='border-b border-(--border-main)/50 align-top'>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className='px-2 py-2 text-(--text-main)'>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className='px-2 py-3 text-(--text-muted)' colSpan={headers.length}>
                  {t('adminDashboard.table.noData')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Toolbar({
  children,
  onApply,
  applyDisabled,
}: {
  children: ReactNode;
  onApply: () => void;
  applyDisabled?: boolean;
}) {
  const { t } = useTranslation('common');
  return (
    <div className='ui-subpanel mb-3 rounded-sm p-3'>
      <div className='grid gap-2 md:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:items-end'>
        {children}
        <Button
          variant='primary'
          className='h-10 w-auto px-5 md:col-start-5 md:justify-self-end'
          onClick={onApply}
          disabled={applyDisabled}
        >
          {t('adminDashboard.toolbar.apply')}
        </Button>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className='grid gap-1'>
      <span className='ui-data-label'>{label}</span>
      {children}
    </label>
  );
}
