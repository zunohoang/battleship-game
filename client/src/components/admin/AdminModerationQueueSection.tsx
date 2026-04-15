import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { BanUserModal } from '@/components/forum/BanUserModal';
import {
  archiveForumPostByAdmin,
  banUserByAdmin,
  deleteForumCommentByAdmin,
  listModerationQueue,
} from '@/services/adminService';
import { getApiErrorCode } from '@/services/httpError';
import type { ModerationItem } from '@/types/admin';
import {
  AdminStatusBadge,
  Field,
  PaginationBar,
  TableShell,
  Toolbar,
} from './adminUi';
import { fmtDate } from './adminUtils';

export function AdminModerationQueueSection() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [statusDraft, setStatusDraft] = useState('pending');
  const [status, setStatus] = useState('pending');
  const [typeDraft, setTypeDraft] = useState('all');
  const [type, setType] = useState('all');
  const [severityDraft, setSeverityDraft] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [banTarget, setBanTarget] = useState<{
    userId: string;
    username: string;
  } | null>(null);
  const [isBanning, setIsBanning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const response = await listModerationQueue({
        page,
        limit,
        q: q || undefined,
        status: status === 'all' ? undefined : status,
        targetType: type === 'all' ? undefined : type,
        severity: severity === 'all' ? undefined : severity,
      });
      setItems(response.data);
      setTotal(response.total);
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    } finally {
      setLoading(false);
    }
  }, [limit, page, q, severity, status, type]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <Toolbar
        onApply={() => {
          setPage(1);
          setQ(qDraft.trim());
          setStatus(statusDraft);
          setType(typeDraft);
          setSeverity(severityDraft);
        }}
      >
        <Field label='Search'>
          <input
            className='ui-input h-10 rounded-sm px-3'
            value={qDraft}
            onChange={(event) => setQDraft(event.target.value)}
            placeholder='keyword / author'
          />
        </Field>
        <Field label='Type'>
          <select
            className='ui-input h-10 rounded-sm px-3'
            value={typeDraft}
            onChange={(event) => setTypeDraft(event.target.value)}
          >
            <option value='all'>All</option>
            <option value='post'>post</option>
            <option value='comment'>comment</option>
          </select>
        </Field>
        <Field label='Status'>
          <select
            className='ui-input h-10 rounded-sm px-3'
            value={statusDraft}
            onChange={(event) => setStatusDraft(event.target.value)}
          >
            <option value='all'>all</option>
            <option value='pending'>pending</option>
            <option value='resolved'>resolved</option>
            <option value='dismissed'>dismissed</option>
          </select>
        </Field>
        <Field label='Severity'>
          <select
            className='ui-input h-10 rounded-sm px-3'
            value={severityDraft}
            onChange={(event) => setSeverityDraft(event.target.value)}
          >
            <option value='all'>all</option>
            <option value='low'>low</option>
            <option value='medium'>medium</option>
            <option value='high'>high</option>
          </select>
        </Field>
      </Toolbar>

      {errorCode ? (
        <p className='mb-2 text-sm font-semibold text-(--accent-danger)'>Error: {errorCode}</p>
      ) : null}
      {loading ? <p className='mb-2 text-sm text-(--text-muted)'>Loading...</p> : null}

      <TableShell
        title='Moderation Queue'
        headers={[
          'ID',
          'Type',
          'Preview',
          'Author',
          'Reports',
          'Severity',
          'Status',
          'Created',
          'Actions',
        ]}
        rows={items.map((item) => [
          item.reportId,
          item.targetType,
          item.contentPreview,
          item.authorUsername,
          item.reportCount,
          <AdminStatusBadge key='sev' value={item.severity} />,
          <AdminStatusBadge key='st' value={item.status} />,
          fmtDate(item.createdAt),
          <div key='actions' className='flex flex-wrap gap-2'>
            {item.targetType === 'post' ? (
              <Button
                variant='default'
                className='h-8 w-auto px-3 text-[11px]'
                onClick={async () => {
                  const reason = window.prompt('Archive reason?', 'Moderation action');
                  if (!reason) {
                    return;
                  }
                  try {
                    await archiveForumPostByAdmin(item.targetId, reason);
                    await load();
                  } catch (error) {
                    setErrorCode(getApiErrorCode(error));
                  }
                }}
              >
                Archive Post
              </Button>
            ) : (
              <Button
                variant='danger'
                className='h-8 w-auto px-3 text-[11px]'
                onClick={async () => {
                  try {
                    await deleteForumCommentByAdmin(item.targetId);
                    await load();
                  } catch (error) {
                    setErrorCode(getApiErrorCode(error));
                  }
                }}
              >
                Delete Comment
              </Button>
            )}
            <Button
              variant='danger'
              className='h-8 w-auto px-3 text-[11px]'
              onClick={() =>
                setBanTarget({
                  userId: item.authorId,
                  username: item.authorUsername,
                })
              }
            >
              Ban User
            </Button>
          </div>,
        ])}
      />

      <PaginationBar page={page} limit={limit} total={total} onPageChange={setPage} />

      <BanUserModal
        isOpen={banTarget !== null}
        username={banTarget?.username ?? null}
        isSubmitting={isBanning}
        onClose={() => setBanTarget(null)}
        onSubmit={async (payload) => {
          if (!banTarget) {
            return;
          }
          setIsBanning(true);
          setErrorCode(null);
          try {
            await banUserByAdmin(banTarget.userId, payload);
            setBanTarget(null);
            await load();
          } catch (error) {
            setErrorCode(getApiErrorCode(error));
          } finally {
            setIsBanning(false);
          }
        }}
      />
    </div>
  );
}
