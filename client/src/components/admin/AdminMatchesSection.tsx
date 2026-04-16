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
  const [stopTarget, setStopTarget] = useState<{
    matchId: string;
    roomCode: string;
  } | null>(null);
  const [stopReason, setStopReason] = useState('Admin stop');
  const [isStopping, setIsStopping] = useState(false);

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
    <div className='flex h-full min-h-0 flex-col'>
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

      <div className='themed-scrollbar min-h-0 flex-1 overflow-y-auto pr-1'>
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
                  onClick={() => {
                    setStopReason('Admin stop');
                    setStopTarget({
                      matchId: match.matchId,
                      roomCode: match.roomCode,
                    });
                  }}
                >
                  Stop Match
                </Button>
              </div>
            ),
          ])}
        />
      </div>

      <div className='mt-2 shrink-0 border-t border-(--border-main) pt-2'>
        <PaginationBar page={page} limit={limit} total={total} onPageChange={setPage} />
      </div>

      {stopTarget ? (
        <div
          className='fixed inset-0 z-[220] flex items-center justify-center bg-[rgba(2,10,20,0.72)] p-3 sm:p-5'
          role='dialog'
          aria-modal='true'
          onClick={() => {
            if (isStopping) {
              return;
            }
            setStopTarget(null);
          }}
        >
          <div
            className='ui-panel w-full max-w-lg rounded-md border border-(--border-main) px-4 py-4 sm:px-5'
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className='font-mono text-xs font-black uppercase tracking-[0.18em] text-(--text-main)'>
              Stop Match
            </h3>
            <p className='mt-2 text-sm text-(--text-muted)'>
              Stop current match in room{' '}
              <span className='font-semibold text-(--text-main)'>
                {stopTarget.roomCode}
              </span>{' '}
              with draw result.
            </p>
            <textarea
              className='ui-input themed-scrollbar mt-3 min-h-24 w-full rounded-sm px-3 py-2'
              value={stopReason}
              onChange={(event) => setStopReason(event.target.value)}
              disabled={isStopping}
              placeholder='Stop match reason...'
            />
            <div className='mt-4 flex justify-end gap-2'>
              <Button
                type='button'
                variant='default'
                className='h-9 w-auto px-4 text-[11px]'
                disabled={isStopping}
                onClick={() => setStopTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type='button'
                variant='danger'
                className='h-9 w-auto px-4 text-[11px]'
                disabled={isStopping || stopReason.trim().length === 0}
                onClick={async () => {
                  if (!stopTarget || stopReason.trim().length === 0) {
                    return;
                  }
                  setIsStopping(true);
                  setErrorCode(null);
                  try {
                    await forceFinishMatch(stopTarget.matchId, {
                      result: 'draw',
                      reason: stopReason.trim(),
                    });
                    setStopTarget(null);
                    await load();
                  } catch (error) {
                    setErrorCode(getApiErrorCode(error));
                  } finally {
                    setIsStopping(false);
                  }
                }}
              >
                {isStopping ? 'Stopping...' : 'Stop Match'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
