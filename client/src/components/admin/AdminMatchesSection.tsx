import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { forceFinishMatch, listAdminMatches } from '@/services/adminService';
import { getApiErrorCode } from '@/services/httpError';
import type { AdminMatch } from '@/types/admin';
import {
  AdminStatusBadge,
  Field,
  PaginationBar,
  TableShell,
  Toolbar,
} from './adminUi';
import { fmtDate } from './adminUtils';

export function AdminMatchesSection() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminMatch[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [statusDraft, setStatusDraft] = useState('all');
  const [status, setStatus] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const response = await listAdminMatches({
        page,
        limit,
        q: q || undefined,
        status: status === 'all' ? undefined : status,
      });
      setItems(response.data);
      setTotal(response.total);
    } catch (error) {
      setErrorCode(getApiErrorCode(error));
    } finally {
      setLoading(false);
    }
  }, [limit, page, q, status]);

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
        }}
      >
        <Field label='Search'>
          <input
            className='ui-input h-10 rounded-sm px-3'
            value={qDraft}
            onChange={(event) => setQDraft(event.target.value)}
            placeholder='match id / room code'
          />
        </Field>
        <Field label='Status'>
          <select
            className='ui-input h-10 rounded-sm px-3'
            value={statusDraft}
            onChange={(event) => setStatusDraft(event.target.value)}
          >
            <option value='all'>all</option>
            <option value='setup'>setup</option>
            <option value='in_progress'>in_progress</option>
            <option value='finished'>finished</option>
          </select>
        </Field>
      </Toolbar>

      {errorCode ? (
        <p className='mb-2 text-sm font-semibold text-(--accent-danger)'>Error: {errorCode}</p>
      ) : null}
      {loading ? <p className='mb-2 text-sm text-(--text-muted)'>Loading...</p> : null}

      <TableShell
        title='Matches'
        headers={[
          'Room',
          'Status',
          'Player 1',
          'Player 2',
          'Winner',
          'Admin Intervention',
          'Updated',
          'Actions',
        ]}
        rows={items.map((match) => [
          match.roomCode,
          <AdminStatusBadge key='status' value={match.status} />,
          match.player1Username,
          match.player2Username,
          match.winnerUsername ?? 'draw / n/a',
          match.endedByAdmin
            ? `${match.adminInterventionType ?? 'admin'}: ${match.adminInterventionReason ?? '-'}`
            : 'none',
          fmtDate(match.updatedAt),
          match.status === 'finished' ? (
            '-'
          ) : (
            <div key='actions' className='flex gap-2'>
              <Button
                variant='default'
                className='h-8 w-auto px-3 text-[11px]'
                onClick={() => navigate(`/game/spectate/${match.roomId}`)}
              >
                Spectate
              </Button>
              <Button
                variant='danger'
                className='h-8 w-auto px-3 text-[11px]'
                onClick={async () => {
                  const reason = window.prompt('Stop match reason?', 'Admin stop');
                  if (!reason) {
                    return;
                  }
                  try {
                    await forceFinishMatch(match.matchId, {
                      result: 'draw',
                      reason,
                    });
                    await load();
                  } catch (error) {
                    setErrorCode(getApiErrorCode(error));
                  }
                }}
              >
                Stop Match
              </Button>
            </div>
          ),
        ])}
      />

      <PaginationBar page={page} limit={limit} total={total} onPageChange={setPage} />
    </div>
  );
}
