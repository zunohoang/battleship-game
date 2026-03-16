import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useOnlineRoom } from '@/hooks/useOnlineRoom';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import type { OnlineSetupFlow } from '@/types/game';

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
  const { isLoggedIn, user } = useGlobalContext();
  const state = (location.state as WaitingLocationState | null) ?? {};
  const roomId = state.roomId;
  const matchId = state.matchId;
  const {
    room,
    match,
    lastError,
    startRoom,
    reconnect,
    leaveRoom,
  } = useOnlineRoom(roomId);

  const currentUserId = user?.id ?? null;
  const isOwner = !!currentUserId && currentUserId === room?.ownerId;
  const hasPhase1Configured = !!room?.currentMatchId;
  const canConfigurePhase1 =
    !!isOwner && room?.status === 'waiting' && !room.currentMatchId;
  const canStartSetup =
    !!isOwner &&
    !!room?.guestId &&
    room.status === 'waiting' &&
    hasPhase1Configured &&
    !!match;
  const [setupNowMs, setSetupNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!match?.setupDeadlineAt) {
      const resetTimeoutId = window.setTimeout(() => {
        setSetupNowMs(null);
      }, 0);

      return () => {
        window.clearTimeout(resetTimeoutId);
      };
    }

    const syncNow = () => {
      setSetupNowMs(Date.now());
    };

    const syncTimeoutId = window.setTimeout(syncNow, 0);
    const intervalId = window.setInterval(syncNow, 1000);

    return () => {
      window.clearTimeout(syncTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [match?.setupDeadlineAt]);

  const secondsLeft =
    !match?.setupDeadlineAt || setupNowMs === null
      ? null
      : Math.max(
        0,
        Math.ceil(
          (new Date(match.setupDeadlineAt).getTime() - setupNowMs) / 1000,
        ),
      );

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
    const timer = window.setInterval(() => {
      reconnect({ roomId, matchId });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isLoggedIn, matchId, navigate, reconnect, roomId]);

  useEffect(() => {
    if (!room || !match) {
      return;
    }

    if (room.status === 'setup') {
      const onlineSetupFlow: OnlineSetupFlow = 'placement';
      navigate('/game/setup', {
        state: {
          mode: 'online',
          roomId: room.roomId,
          matchId: match.id,
          onlineSetupFlow,
        },
      });
    }
  }, [match, navigate, room]);

  const phase1Summary = useMemo(() => {
    if (!match) {
      return null;
    }

    const totalCells = match.ships.reduce((sum, ship) => sum + ship.size * ship.count, 0);
    return {
      rows: match.boardConfig.rows,
      cols: match.boardConfig.cols,
      shipTypes: match.ships.length,
      totalCells,
    };
  }, [match]);

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
        <div className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]'>
          <section className='ui-panel rounded-md p-5'>
            <h1 className='font-mono text-2xl font-black uppercase tracking-[0.08em] text-(--text-main)'>
              Waiting Room
            </h1>
            <p className='mt-2 text-sm text-(--text-muted)'>
              Finish phase 1, invite an opponent, then start placement setup.
            </p>

            <div className='mt-5 grid gap-3 sm:grid-cols-3'>
              <div className='ui-subpanel rounded-sm px-4 py-3'>
                <p className='ui-data-label'>Room code</p>
                <p className='mt-1 font-mono text-2xl font-black tracking-[0.18em] text-(--accent-secondary)'>
                  {room?.roomCode ?? '------'}
                </p>
              </div>
              <div className='ui-subpanel rounded-sm px-4 py-3'>
                <p className='ui-data-label'>Room status</p>
                <p className='mt-1 font-mono text-xs uppercase tracking-[0.16em] text-(--text-main)'>
                  {room?.status ?? 'loading'}
                </p>
              </div>
              <div className='ui-subpanel rounded-sm px-4 py-3'>
                <p className='ui-data-label'>Phase 1</p>
                <p className='mt-1 font-mono text-xs uppercase tracking-[0.16em] text-(--text-main)'>
                  {hasPhase1Configured ? 'configured' : 'pending'}
                </p>
              </div>
            </div>

            <div className='ui-subpanel mt-4 rounded-sm px-4 py-4'>
              <p className='ui-data-label'>Phase 1 summary</p>
              {phase1Summary ? (
                <div className='mt-2 grid gap-1 text-sm'>
                  <p>
                    Match ID:{' '}
                    <span className='font-mono text-(--accent-secondary)'>
                      {shortId(match?.id ?? matchId ?? room?.currentMatchId)}
                    </span>
                  </p>
                  <p>
                    Board:{' '}
                    <span className='font-mono text-(--text-main)'>
                      {phase1Summary.rows} x {phase1Summary.cols}
                    </span>
                  </p>
                  <p>
                    Fleet:{' '}
                    <span className='font-mono text-(--text-main)'>
                      {phase1Summary.shipTypes} types / {phase1Summary.totalCells} cells
                    </span>
                  </p>
                  <p>
                    Setup timer:{' '}
                    <span className='font-mono text-(--text-main)'>
                      {secondsLeft === null ? 'not started' : `${secondsLeft}s`}
                    </span>
                  </p>
                  <p>
                    Version:{' '}
                    <span className='font-mono text-(--text-main)'>
                      {match?.version ?? 0}
                    </span>
                  </p>
                </div>
              ) : (
                <p className='mt-2 text-sm text-(--text-muted)'>
                  The host still needs to configure phase 1 before this room can accept an opponent.
                </p>
              )}
            </div>

            <div className='ui-subpanel mt-4 rounded-sm px-4 py-4'>
              <p className='ui-data-label'>Players</p>
              <div className='mt-2 grid gap-1 text-sm'>
                <p>
                  Host:{' '}
                  <span className='font-mono text-(--text-main)'>
                    {shortId(room?.ownerId)}
                  </span>
                </p>
                <p>
                  Opponent:{' '}
                  <span className='font-mono text-(--text-main)'>
                    {shortId(room?.guestId)}
                  </span>
                </p>
                <p>
                  Match player 1:{' '}
                  <span className='font-mono text-(--text-main)'>
                    {shortId(match?.player1Id)}
                  </span>
                </p>
                <p>
                  Match player 2:{' '}
                  <span className='font-mono text-(--text-main)'>
                    {shortId(match?.player2Id)}
                  </span>
                </p>
              </div>
            </div>

            {hasPhase1Configured && isOwner ? (
              <p className='mt-4 text-xs uppercase tracking-[0.16em] text-(--text-subtle)'>
                Phase 1 is locked after save. Create a new room to change board or fleet settings.
              </p>
            ) : null}

            {lastError ? (
              <p className='mt-4 rounded-sm border border-[rgba(220,60,60,0.5)] bg-[rgba(160,30,30,0.2)] px-3 py-2 text-xs text-[rgba(255,170,170,0.95)]'>
                {lastError}
              </p>
            ) : null}
          </section>

          <aside className='ui-panel rounded-md p-4'>
            <div className='space-y-3'>
              {isOwner ? (
                <Button
                  variant='primary'
                  className='h-11'
                  disabled={!canConfigurePhase1}
                  onClick={() => {
                    const onlineSetupFlow: OnlineSetupFlow = 'phase1';
                    navigate('/game/setup', {
                      state: {
                        mode: 'online',
                        roomId: room?.roomId ?? roomId,
                        matchId: match?.id ?? matchId,
                        onlineSetupFlow,
                      },
                    });
                  }}
                >
                  {canConfigurePhase1 ? 'Setup Phase 1' : 'Phase 1 Locked'}
                </Button>
              ) : null}

              <Button
                variant='primary'
                className='h-11'
                disabled={!canStartSetup}
                onClick={() => {
                  if (!room?.roomId) return;
                  startRoom({ roomId: room.roomId });
                }}
              >
                {canStartSetup
                  ? 'Start Setup'
                  : !isOwner
                    ? 'Waiting For Owner'
                    : !hasPhase1Configured
                      ? 'Finish Phase 1 First'
                      : !room?.guestId
                        ? 'Waiting For Opponent'
                        : 'Setup Locked'}
              </Button>

              <Button
                className='h-11'
                onClick={() => reconnect({ roomId, matchId })}
              >
                Refresh State
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
