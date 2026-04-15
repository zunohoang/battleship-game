import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listAuditLogs } from '@/services/adminService';
import { getApiErrorCode } from '@/services/httpError';
import type { AdminAuditLog } from '@/types/admin';
import { Field, PaginationBar, TableShell, Toolbar } from './adminUi';
import { fmtDate } from './adminUtils';

export function AdminAuditLogsSection() {
  const { t } = useTranslation('common');
  const [items, setItems] = useState<AdminAuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [actionDraft, setActionDraft] = useState('all');
  const [action, setAction] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const response = await listAuditLogs({
        page,
        limit,
        q: q || undefined,
        action: action === 'all' ? undefined : action,
      });
      setItems(response.data);
      setTotal(response.total);
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    } finally {
      setLoading(false);
    }
  }, [action, limit, page, q]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <Toolbar
        onApply={() => {
          setPage(1);
          setQ(qDraft.trim());
          setAction(actionDraft);
        }}
      >
        <Field label={t('adminDashboard.audit.filters.searchLabel')}>
          <input
            className='ui-input h-10 rounded-sm px-3'
            value={qDraft}
            onChange={(event) => setQDraft(event.target.value)}
            placeholder={t('adminDashboard.audit.filters.searchPlaceholder')}
          />
        </Field>
        <Field label={t('adminDashboard.audit.filters.actionLabel')}>
          <select
            className='ui-input h-10 rounded-sm px-3'
            value={actionDraft}
            onChange={(event) => setActionDraft(event.target.value)}
          >
            <option value='all'>{t('adminDashboard.audit.filters.allActions')}</option>
            <option value='BAN_USER_TEMP'>BAN_USER_TEMP</option>
            <option value='BAN_USER_PERMANENT'>BAN_USER_PERMANENT</option>
            <option value='UNBAN_USER'>UNBAN_USER</option>
            <option value='ARCHIVE_FORUM_POST'>ARCHIVE_FORUM_POST</option>
            <option value='DELETE_FORUM_COMMENT'>DELETE_FORUM_COMMENT</option>
            <option value='FORCE_CLOSE_ROOM'>FORCE_CLOSE_ROOM</option>
            <option value='MATCH_FINISHED'>MATCH_FINISHED</option>
            <option value='MATCH_SUSPENDED_BY_ADMIN'>MATCH_SUSPENDED_BY_ADMIN</option>
          </select>
        </Field>
      </Toolbar>

      {errorCode ? (
        <p className='mb-2 text-sm font-semibold text-(--accent-danger)'>
          {t('adminDashboard.errorWithCode', { code: errorCode })}
        </p>
      ) : null}
      {loading ? (
        <p className='mb-2 text-sm text-(--text-muted)'>
          {t('adminDashboard.audit.loading')}
        </p>
      ) : null}

      <TableShell
        title={t('adminDashboard.audit.title')}
        headers={[
          t('adminDashboard.audit.table.time'),
          t('adminDashboard.audit.table.actor'),
          t('adminDashboard.audit.table.action'),
          t('adminDashboard.audit.table.target'),
          t('adminDashboard.audit.table.metadata'),
        ]}
        rows={items.map((item) => [
          fmtDate(item.createdAt),
          item.actor,
          item.action,
          item.target,
          item.metadata ?? '-',
        ])}
      />

      <PaginationBar page={page} limit={limit} total={total} onPageChange={setPage} />
    </div>
  );
}
