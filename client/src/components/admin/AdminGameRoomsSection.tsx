import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  forceCloseRoom,
  forceFinishMatch,
  listAdminRooms,
} from '@/services/adminService';
import { getApiErrorCode } from '@/services/httpError';
import type { AdminRoom } from '@/types/admin';
import {
  AdminStatusBadge,
  Field,
  PaginationBar,
  TableShell,
  Toolbar,
} from './adminUi';
import { fmtDate } from './adminUtils';

export function AdminGameRoomsSection() {
  const [items, setItems] = useState<AdminRoom[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [statusDraft, setStatusDraft] = useState('all');
  const [status, setStatus] = useState('all');
  const [visibilityDraft, setVisibilityDraft] = useState('all');
  const [visibility, setVisibility] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const response = await listAdminRooms({
        page,
        limit,
        q: q || undefined,
        status: status === 'all' ? undefined : status,
        visibility: visibility === 'all' ? undefined : visibility,
      });
      setItems(response.data);
      setTotal(response.total);
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    } finally {
      setLoading(false);
    }
  }, [limit, page, q, status, visibility]);

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
          setVisibility(visibilityDraft);
        }}
      >
        <Field label='Search'>
          <input
            className='ui-input h-10 rounded-sm px-3'
            value={qDraft}
            onChange={(event) => setQDraft(event.target.value)}
            placeholder='Room code / user'
          />
        </Field>
        <Field label='Status'>
          <select
            className='ui-input h-10 rounded-sm px-3'
            value={statusDraft}
            onChange={(event) => setStatusDraft(event.target.value)}
          >
            <option value='all'>All</option>
            <option value='waiting'>waiting</option>
            <option value='setup'>setup</option>
            <option value='in_game'>in_game</option>
            <option value='finished'>finished</option>
            <option value='closed'>closed</option>
          </select>
        </Field>
        <Field label='Visibility'>
          <select
            className='ui-input h-10 rounded-sm px-3'
            value={visibilityDraft}
            onChange={(event) => setVisibilityDraft(event.target.value)}
          >
            <option value='all'>All</option>
            <option value='public'>public</option>
            <option value='private'>private</option>
          </select>
        </Field>
      </Toolbar>

      {errorCode ? (
        <p className='mb-2 text-sm font-semibold text-(--accent-danger)'>Error: {errorCode}</p>
      ) : null}
      {loading ? <p className='mb-2 text-sm text-(--text-muted)'>Loading...</p> : null}

      <TableShell
        title='Game Rooms'
        headers={[
          'Room Code',
          'Status',
          'Visibility',
          'Owner',
          'Guest',
          'Phase',
          'Updated',
          'Actions',
        ]}
        rows={items.map((room) => [
          room.roomCode,
          <AdminStatusBadge key='status' value={room.status} />,
          room.visibility,
          room.ownerUsername,
          room.guestUsername ?? '-',
          room.phase,
          fmtDate(room.updatedAt),
          <div key='actions' className='flex gap-2'>
            <Button
              variant='danger'
              className='h-8 w-auto px-3 text-[11px]'
              onClick={async () => {
                const reason = window.prompt('Reason for force close?', 'Admin close');
                if (!reason) {
                  return;
                }
                try {
                  await forceCloseRoom(room.roomId, reason);
                  await load();
                } catch (error) {
                  setErrorCode(getApiErrorCode(error));
                }
              }}
            >
              Force Close
            </Button>
            <Button
              variant='default'
              className='h-8 w-auto px-3 text-[11px]'
              onClick={async () => {
                if (!room.currentMatchId) {
                  setErrorCode('MATCH_NOT_FOUND');
                  return;
                }
                const reason = window.prompt('Reason for force finish?', 'Admin settle');
                if (!reason) {
                  return;
                }
                try {
                  await forceFinishMatch(room.currentMatchId, {
                    result: 'draw',
                    reason,
                  });
                  await load();
                } catch (error) {
                  setErrorCode(getApiErrorCode(error));
                }
              }}
            >
              Force Finish
            </Button>
          </div>,
        ])}
      />

      <PaginationBar page={page} limit={limit} total={total} onPageChange={setPage} />
    </div>
  );
}
