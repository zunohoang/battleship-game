import { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { SectionStatus } from '@/components/ui/SectionStatus';
import { useOnlineRoom } from '@/hooks/useOnlineRoom';
import { useGlobalContext } from '@/hooks/useGlobalContext';

type WaitingLocationState = {
  roomId?: string;
  matchId?: string;
};

function shortId(value: string | null | undefined): string {
  if (!value) return '---';
  return `${value.slice(0, 8)}...`;
}

export function WaitingRoomPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');
  const { isLoggedIn } = useGlobalContext();
  const state = (location.state as WaitingLocationState | null) ?? {};
  const roomId = state.roomId;
  const matchId = state.matchId;
  const {
    room,
    match,
    connectionState,
    lastError,
    reconnect,
    leaveRoom,
  } = useOnlineRoom(roomId);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/home');
      return;
    }

    if (!roomId && !matchId) {
      navigate('/game/rooms');
      return;
    }

    reconnect({ roomId, matchId });
  }, [isLoggedIn, matchId, navigate, reconnect, roomId]);

  const statusLabel = useMemo(() => {
    if (connectionState === 'connected') return 'SYNCED';
    if (connectionState === 'connecting') return 'SYNCING';
    if (connectionState === 'error') return 'ERROR';
    return 'IDLE';
  }, [connectionState]);

  return (
    <motion.main
      className='relative min-h-screen overflow-hidden px-4 py-5 text-(--text-main) sm:px-8'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className='ui-page-bg -z-20' />
      <div className='absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(50,217,255,0.08),transparent_38%)]' />

      <section className='ui-hud-shell mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col rounded-md p-4 sm:p-6'>
        <SectionStatus
          leftText={t('home.status.system')}
          rightText={`WAITING ${statusLabel}`}
        />

        <div className='mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]'>
          <section className='ui-panel rounded-md p-5'>
            <h1 className='font-mono text-2xl font-black uppercase tracking-[0.08em] text-(--text-main)'>
              Waiting Room
            </h1>
            <p className='mt-2 text-sm text-(--text-muted)'>
              Share room code and wait for both captains to be ready.
            </p>

            <div className='mt-5 grid gap-3 sm:grid-cols-2'>
              <div className='rounded-sm border border-(--border-main) bg-black/10 px-4 py-3'>
                <p className='ui-data-label'>Room code</p>
                <p className='mt-1 font-mono text-2xl font-black tracking-[0.18em] text-(--accent-secondary)'>
                  {room?.roomCode ?? '------'}
                </p>
              </div>
              <div className='rounded-sm border border-(--border-main) bg-black/10 px-4 py-3'>
                <p className='ui-data-label'>Room status</p>
                <p className='mt-1 font-mono text-xs uppercase tracking-[0.16em] text-(--text-main)'>
                  {room?.status ?? 'loading'}
                </p>
              </div>
            </div>

            <div className='mt-4 rounded-sm border border-(--border-main) bg-black/10 px-4 py-3'>
              <p className='ui-data-label'>Match</p>
              <div className='mt-2 grid gap-1 text-sm'>
                <p>Match ID: <span className='font-mono text-(--accent-secondary)'>{shortId(match?.id ?? matchId)}</span></p>
                <p>Player 1: <span className='font-mono'>{shortId(match?.player1Id)}</span></p>
                <p>Player 2: <span className='font-mono'>{shortId(match?.player2Id)}</span></p>
                <p>Version: <span className='font-mono'>{match?.version ?? 0}</span></p>
              </div>
            </div>

            {lastError ? (
              <p className='mt-4 rounded-sm border border-[rgba(220,60,60,0.5)] bg-[rgba(160,30,30,0.2)] px-3 py-2 text-xs text-[rgba(255,170,170,0.95)]'>
                {lastError}
              </p>
            ) : null}
          </section>

          <aside className='ui-panel rounded-md p-4'>
            <div className='space-y-3'>
              <Button
                variant='primary'
                className='h-11'
                onClick={() => reconnect({ roomId, matchId })}
              >
                Refresh State
              </Button>
              <Button
                className='h-11'
                onClick={() =>
                  navigate('/game/setup', {
                    state: {
                      mode: 'online',
                      roomId: room?.roomId ?? roomId,
                      matchId: match?.id ?? matchId,
                    },
                  })
                }
              >
                Open Setup
              </Button>
              <Button
                variant='danger'
                className='h-11'
                onClick={() => {
                  leaveRoom();
                  navigate('/game/rooms');
                }}
              >
                Leave Room
              </Button>
              <Button className='h-11' onClick={() => navigate('/home')}>
                Back Home
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </motion.main>
  );
}
