import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { BanUserModal } from '@/components/forum/BanUserModal';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import {
  banUserByAdmin,
  grantModeratorRoleByAdmin,
  listAdminUsers,
  revokeModeratorRoleByAdmin,
  unbanUserByAdmin,
} from '@/services/adminService';
import { getApiErrorCode } from '@/services/httpError';
import type { AdminUser } from '@/types/admin';
import {
  AdminStatusBadge,
  Field,
  PaginationBar,
  TableShell,
  Toolbar,
} from './adminUi';
import { fmtDate } from './adminUtils';

export function AdminUsersSection() {
  const { user } = useGlobalContext();
  const isSuperAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const [items, setItems] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [roleDraft, setRoleDraft] = useState('all');
  const [role, setRole] = useState('all');
  const [banStatusDraft, setBanStatusDraft] = useState('all');
  const [banStatus, setBanStatus] = useState('all');
  const [banTarget, setBanTarget] = useState<{
    userId: string;
    username: string;
  } | null>(null);
  const [isBanning, setIsBanning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const response = await listAdminUsers({
        page,
        limit,
        q: q || undefined,
        role: role === 'all' ? undefined : role,
        banStatus: banStatus === 'all' ? undefined : banStatus,
      });
      setItems(response.data);
      setTotal(response.total);
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    } finally {
      setLoading(false);
    }
  }, [banStatus, limit, page, q, role]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <Toolbar
        onApply={() => {
          setPage(1);
          setQ(qDraft.trim());
          setRole(roleDraft);
          setBanStatus(banStatusDraft);
        }}
      >
        <Field label='Search'>
          <input
            className='ui-input h-10 rounded-sm px-3'
            value={qDraft}
            onChange={(event) => setQDraft(event.target.value)}
            placeholder='username / email'
          />
        </Field>
        <Field label='Role'>
          <select
            className='ui-input h-10 rounded-sm px-3'
            value={roleDraft}
            onChange={(event) => setRoleDraft(event.target.value)}
          >
            <option value='all'>all</option>
            <option value='USER'>USER</option>
            <option value='MOD'>MOD</option>
            <option value='ADMIN'>ADMIN</option>
          </select>
        </Field>
        <Field label='Ban Status'>
          <select
            className='ui-input h-10 rounded-sm px-3'
            value={banStatusDraft}
            onChange={(event) => setBanStatusDraft(event.target.value)}
          >
            <option value='all'>all</option>
            <option value='not_banned'>not_banned</option>
            <option value='temporary'>temporary</option>
            <option value='permanent'>permanent</option>
          </select>
        </Field>
      </Toolbar>

      {errorCode ? (
        <p className='mb-2 text-sm font-semibold text-(--accent-danger)'>Error: {errorCode}</p>
      ) : null}
      {loading ? <p className='mb-2 text-sm text-(--text-muted)'>Loading...</p> : null}

      <TableShell
        title='Users'
        headers={[
          'Username',
          'Email',
          'Role',
          'ELO',
          'Ban Status',
          'Reason',
          'Banned At',
          'Actions',
        ]}
        rows={items.map((item) => [
          item.username,
          item.email,
          item.role,
          item.elo,
          <AdminStatusBadge key='status' value={item.banStatus} />,
          item.banReason ?? '-',
          fmtDate(item.bannedAt),
          <div key='actions' className='flex gap-2'>
            {isSuperAdmin && item.role === 'USER' ? (
              <Button
                variant='default'
                className='h-8 w-auto px-3 text-[11px]'
                onClick={async () => {
                  try {
                    await grantModeratorRoleByAdmin(item.userId);
                    await load();
                  } catch (error) {
                    setErrorCode(getApiErrorCode(error));
                  }
                }}
              >
                Grant Mod
              </Button>
            ) : null}
            {isSuperAdmin && item.role === 'MOD' ? (
              <Button
                variant='default'
                className='h-8 w-auto px-3 text-[11px]'
                onClick={async () => {
                  try {
                    await revokeModeratorRoleByAdmin(item.userId);
                    await load();
                  } catch (error) {
                    setErrorCode(getApiErrorCode(error));
                  }
                }}
              >
                Revoke Mod
              </Button>
            ) : null}
            {isSuperAdmin && item.role !== 'ADMIN'
              ? item.banStatus === 'not_banned'
                ? (
                  <Button
                    variant='danger'
                    className='h-8 w-auto px-3 text-[11px]'
                    onClick={() =>
                      setBanTarget({
                        userId: item.userId,
                        username: item.username,
                      })
                    }
                  >
                    Ban
                  </Button>
                )
                : (
                  <Button
                    variant='default'
                    className='h-8 w-auto px-3 text-[11px]'
                    onClick={async () => {
                      try {
                        await unbanUserByAdmin(item.userId);
                        await load();
                      } catch (error) {
                        setErrorCode(getApiErrorCode(error));
                      }
                    }}
                  >
                    Unban
                  </Button>
                )
              : null}
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
