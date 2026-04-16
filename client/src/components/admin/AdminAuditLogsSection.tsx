import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listAuditLogs } from '@/services/adminService';
import { getApiErrorCode } from '@/services/httpError';
import type { AdminAuditLog } from '@/types/admin';
import { Field, PaginationBar, TableShell, Toolbar } from './adminUi';
import { fmtDate } from './adminUtils';

const ACTION_LABELS: Record<string, string> = {
  BAN_USER_TEMP: 'Ban tạm thời người dùng',
  BAN_USER_PERMANENT: 'Ban vĩnh viễn người dùng',
  UNBAN_USER: 'Gỡ ban cho người dùng',
  ARCHIVE_FORUM_POST: 'Ẩn bài viết trên diễn đàn',
  DELETE_FORUM_COMMENT: 'Ẩn bình luận trên diễn đàn',
  FORCE_CLOSE_ROOM: 'Đóng phòng',
  MATCH_FINISHED: 'Kết thúc trận đấu',
  MATCH_SUSPENDED_BY_ADMIN: 'Hủy trận đấu',
};

function formatActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replaceAll('_', ' ').toLowerCase();
}

function formatTargetLabel(target: string): string {
  if (!target.includes(':')) {
    return target;
  }
  const parts = target.split(':');
  const kind = parts[0];
  const rawId = parts[1] ?? '';

  if (kind === 'post' && parts.length >= 3) {
    const author = parts[2];
    const shortId = rawId.length > 10 ? `${rawId.slice(0, 10)}...` : rawId;
    return `Bài viết của ${author} (${shortId})`;
  }

  if (kind === 'match' && parts.length >= 4 && parts[2] === 'room') {
    const roomCode = parts[3];
    return `Trận đấu phòng ${roomCode}`;
  }

  const kindLabelMap: Record<string, string> = {
    post: 'Bài viết',
    comment: 'Bình luận',
    match: 'Trận đấu',
    room: 'Phòng',
    user: 'Người dùng',
  };
  const kindLabel = kindLabelMap[kind] ?? kind;
  const shortId = rawId.length > 12 ? `${rawId.slice(0, 12)}...` : rawId;
  return `${kindLabel}: ${shortId}`;
}

function formatMetadata(metadata: string | undefined, action: string): string {
  if (!metadata) {
    return '-';
  }
  const normalized = metadata.replaceAll('\n', ' ').trim();
  const parts = normalized.split(/\s+/).filter(Boolean);
  const keyValueParts = parts.filter((part) => part.includes('='));
  if (keyValueParts.length === 0) {
    if (action === 'ARCHIVE_FORUM_POST') {
      return `Nội dung: ${normalized}`;
    }
    return normalized;
  }

  return keyValueParts
    .map((part) => {
      const [key, ...rest] = part.split('=');
      const value = rest.join('=');
      const keyLabelMap: Record<string, string> = {
        reason: 'Lý do',
        type: 'Loại',
        days: 'Số ngày',
        winnerId: 'Người thắng',
      };
      const keyLabel = keyLabelMap[key] ?? key;
      return `${keyLabel}: ${value}`;
    })
    .join('\n');
}

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
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar
        onApply={() => {
          setPage(1);
          setQ(qDraft.trim());
          setAction(actionDraft);
        }}
      >
        <Field label={t('adminDashboard.audit.filters.searchLabel')}>
          <input
            className="ui-input h-10 rounded-sm px-3"
            value={qDraft}
            onChange={(event) => setQDraft(event.target.value)}
            placeholder={t('adminDashboard.audit.filters.searchPlaceholder')}
          />
        </Field>
        <Field label={t('adminDashboard.audit.filters.actionLabel')}>
          <select
            className="ui-input h-10 rounded-sm px-3"
            value={actionDraft}
            onChange={(event) => setActionDraft(event.target.value)}
          >
            <option value="all">
              {t('adminDashboard.audit.filters.allActions')}
            </option>
            <option value="BAN_USER_TEMP">BAN_USER_TEMP</option>
            <option value="BAN_USER_PERMANENT">BAN_USER_PERMANENT</option>
            <option value="UNBAN_USER">UNBAN_USER</option>
            <option value="ARCHIVE_FORUM_POST">ARCHIVE_FORUM_POST</option>
            <option value="DELETE_FORUM_COMMENT">DELETE_FORUM_COMMENT</option>
            <option value="FORCE_CLOSE_ROOM">FORCE_CLOSE_ROOM</option>
            <option value="MATCH_FINISHED">MATCH_FINISHED</option>
            <option value="MATCH_SUSPENDED_BY_ADMIN">
              MATCH_SUSPENDED_BY_ADMIN
            </option>
          </select>
        </Field>
      </Toolbar>

      <div className="themed-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
        {errorCode ? (
          <p className="mb-2 text-sm font-semibold text-(--accent-danger)">
            {t('adminDashboard.errorWithCode', { code: errorCode })}
          </p>
        ) : null}
        {loading ? (
          <p className="mb-2 text-sm text-(--text-muted)">
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
            formatActionLabel(item.action),
            formatTargetLabel(item.target),
            <span key={`${item.id}-meta`} className="whitespace-pre-line">
              {formatMetadata(item.metadata, item.action)}
            </span>,
          ])}
        />
      </div>

      <div className="mt-2 shrink-0 border-t border-(--border-main) pt-2">
        <PaginationBar
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
