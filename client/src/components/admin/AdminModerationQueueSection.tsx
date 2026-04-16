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
  const [archiveTarget, setArchiveTarget] = useState<{
    postId: string;
    author: string;
  } | null>(null);
  const [archiveReason, setArchiveReason] = useState('Moderation action');
  const [isArchiving, setIsArchiving] = useState(false);

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
        <Field label="Search">
          <input
            className="ui-input h-10 rounded-sm px-3"
            value={qDraft}
            onChange={(event) => setQDraft(event.target.value)}
            placeholder="keyword / author"
          />
        </Field>
        <Field label="Type">
          <select
            className="ui-input h-10 rounded-sm px-3"
            value={typeDraft}
            onChange={(event) => setTypeDraft(event.target.value)}
          >
            <option value="all">All</option>
            <option value="post">post</option>
            <option value="comment">comment</option>
          </select>
        </Field>
        <Field label="Status">
          <select
            className="ui-input h-10 rounded-sm px-3"
            value={statusDraft}
            onChange={(event) => setStatusDraft(event.target.value)}
          >
            <option value="all">all</option>
            <option value="pending">pending</option>
            <option value="resolved">resolved</option>
            <option value="dismissed">dismissed</option>
          </select>
        </Field>
        <Field label="Severity">
          <select
            className="ui-input h-10 rounded-sm px-3"
            value={severityDraft}
            onChange={(event) => setSeverityDraft(event.target.value)}
          >
            <option value="all">all</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </Field>
      </Toolbar>

      {errorCode ? (
        <p className="mb-2 text-sm font-semibold text-(--accent-danger)">
          Error: {errorCode}
        </p>
      ) : null}
      {loading ? (
        <p className="mb-2 text-sm text-(--text-muted)">Loading...</p>
      ) : null}

      <TableShell
        title="Moderation Queue"
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
          <AdminStatusBadge key="sev" value={item.severity} />,
          <AdminStatusBadge key="st" value={item.status} />,
          fmtDate(item.createdAt),
          <div key="actions" className="flex flex-wrap gap-2">
            {item.targetType === 'post' ? (
              <Button
                variant="default"
                className="h-8 w-auto px-3 text-[11px]"
                onClick={() => {
                  setArchiveReason('Moderation action');
                  setArchiveTarget({
                    postId: item.targetId,
                    author: item.authorUsername,
                  });
                }}
              >
                Archive Post
              </Button>
            ) : (
              <Button
                variant="danger"
                className="h-8 w-auto px-3 text-[11px]"
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
              variant="danger"
              className="h-8 w-auto px-3 text-[11px]"
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

      <PaginationBar
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
      />

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

      {archiveTarget ? (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-[rgba(2,10,20,0.72)] p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (isArchiving) {
              return;
            }
            setArchiveTarget(null);
          }}
        >
          <div
            className="ui-panel w-full max-w-lg rounded-md border border-(--border-main) px-4 py-4 sm:px-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-(--text-main)">
              Archive Post
            </h3>
            <p className="mt-2 text-sm text-(--text-muted)">
              Provide archive reason for{' '}
              <span className="font-semibold text-(--text-main)">
                {archiveTarget.author}
              </span>
              .
            </p>
            <textarea
              className="ui-input themed-scrollbar mt-3 min-h-24 w-full rounded-sm px-3 py-2"
              value={archiveReason}
              onChange={(event) => setArchiveReason(event.target.value)}
              disabled={isArchiving}
              placeholder="Archive reason..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="default"
                className="h-9 w-auto px-4 text-[11px]"
                disabled={isArchiving}
                onClick={() => setArchiveTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="h-9 w-auto px-4 text-[11px]"
                disabled={isArchiving || archiveReason.trim().length === 0}
                onClick={async () => {
                  if (!archiveTarget || archiveReason.trim().length === 0) {
                    return;
                  }
                  setIsArchiving(true);
                  setErrorCode(null);
                  try {
                    await archiveForumPostByAdmin(
                      archiveTarget.postId,
                      archiveReason.trim(),
                    );
                    setArchiveTarget(null);
                    await load();
                  } catch (error) {
                    setErrorCode(getApiErrorCode(error));
                  } finally {
                    setIsArchiving(false);
                  }
                }}
              >
                {isArchiving ? 'Archiving...' : 'Archive'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
