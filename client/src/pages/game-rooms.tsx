import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { SectionStatus } from '@/components/ui/SectionStatus';
import { DEFAULT_GAME_CONFIG } from '@/constants/gameDefaults';
import { useOnlineRoom } from '@/hooks/useOnlineRoom';
import { useGlobalContext } from '@/hooks/useGlobalContext';

type PendingAction = 'none' | 'creating' | 'joining';

export function GameRoomsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { isLoggedIn } = useGlobalContext();
  const {
    connectionState,
    rooms,
    room,
    match,
    lastError,
    listRooms,
    createRoom,
    joinRoom,
  } = useOnlineRoom();
  const [roomCode, setRoomCode] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [pendingAction, setPendingAction] = useState<PendingAction>('none');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/home');
      return;
    }

    listRooms();
    const timer = window.setInterval(() => {
      listRooms();
    }, 4000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isLoggedIn, listRooms, navigate]);

  useEffect(() => {
    if (!room || !match || pendingAction === 'none') {
      return;
    }

    navigate('/game/waiting', {
      state: {
        roomId: room.roomId,
        matchId: match.id,
      },
    });
  }, [match, navigate, pendingAction, room]);

  const canJoinByCode = roomCode.trim().length >= 4;

  const connectionLabel = useMemo(() => {
    if (connectionState === 'connected') return 'ONLINE';
    if (connectionState === 'connecting') return 'CONNECTING';
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

      <section className='ui-hud-shell mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col rounded-md p-4 sm:p-6'>
        <SectionStatus
          leftText={t('home.status.system')}
          rightText={`ROOMS ${connectionLabel}`}
        />

        <div className='mt-5 grid gap-6 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]'>
          <aside className='ui-panel rounded-md p-4 sm:p-5'>
            <h1 className='font-mono text-xl font-black uppercase tracking-[0.08em] text-(--text-main)'>
              Online Rooms
            </h1>
            <p className='mt-2 text-sm text-(--text-muted)'>
              Create a room, share code, or join an open public room.
            </p>

            <div className='mt-5 space-y-3 rounded-sm border border-(--border-main) bg-black/10 p-3'>
              <p className='ui-data-label'>Create room</p>
              <div className='grid grid-cols-2 gap-2'>
                <Button
                  variant={visibility === 'public' ? 'primary' : 'default'}
                  className='h-10'
                  onClick={() => setVisibility('public')}
                >
                  Public
                </Button>
                <Button
                  variant={visibility === 'private' ? 'primary' : 'default'}
                  className='h-10'
                  onClick={() => setVisibility('private')}
                >
                  Private
                </Button>
              </div>
              <Button
                variant='primary'
                className='h-11'
                onClick={() => {
                  setPendingAction('creating');
                  createRoom({
                    visibility,
                    boardConfig: DEFAULT_GAME_CONFIG.boardConfig,
                    ships: DEFAULT_GAME_CONFIG.ships,
                  });
                }}
              >
                {pendingAction === 'creating' ? 'Creating...' : 'Create Room'}
              </Button>
            </div>

            <div className='mt-4 space-y-3 rounded-sm border border-(--border-main) bg-black/10 p-3'>
              <p className='ui-data-label'>Join with code</p>
              <input
                className='ui-input h-11 w-full rounded-sm px-3 font-mono text-sm uppercase tracking-[0.14em]'
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                placeholder='ROOM CODE'
                maxLength={8}
              />
              <Button
                className='h-11'
                disabled={!canJoinByCode}
                onClick={() => {
                  setPendingAction('joining');
                  joinRoom({ roomCode: roomCode.trim() });
                }}
              >
                {pendingAction === 'joining' ? 'Joining...' : 'Join by Code'}
              </Button>
            </div>

            <div className='mt-4 flex gap-2'>
              <Button className='h-10' onClick={() => listRooms()}>
                Refresh
              </Button>
              <Button className='h-10' onClick={() => navigate('/home')}>
                Back
              </Button>
            </div>

            {lastError ? (
              <p className='mt-4 rounded-sm border border-[rgba(220,60,60,0.5)] bg-[rgba(160,30,30,0.2)] px-3 py-2 text-xs text-[rgba(255,170,170,0.95)]'>
                {lastError}
              </p>
            ) : null}
          </aside>

          <section className='ui-panel rounded-md p-4 sm:p-5'>
            <div className='flex items-center justify-between gap-3'>
              <h2 className='font-mono text-lg font-black uppercase tracking-[0.08em] text-(--text-main)'>
                Public Rooms
              </h2>
              <span className='ui-data-label'>{rooms.length} available</span>
            </div>

            <div className='mt-4 grid gap-3'>
              {rooms.length === 0 ? (
                <div className='rounded-sm border border-(--border-main) bg-black/10 px-4 py-6 text-sm text-(--text-muted)'>
                  No open room now. Create one and wait for opponent.
                </div>
              ) : (
                rooms.map((openRoom) => (
                  <div
                    key={openRoom.roomId}
                    className='rounded-sm border border-(--border-main) bg-black/10 px-4 py-3'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                      <div>
                        <p className='ui-data-label'>Code</p>
                        <p className='font-mono text-lg font-black tracking-[0.14em] text-(--accent-secondary)'>
                          {openRoom.roomCode}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='ui-data-label'>Status</p>
                        <p className='font-mono text-xs uppercase tracking-[0.14em] text-(--text-main)'>
                          {openRoom.status}
                        </p>
                      </div>
                      <Button
                        className='h-10 w-36'
                        onClick={() => {
                          setPendingAction('joining');
                          joinRoom({ roomCode: openRoom.roomCode });
                        }}
                      >
                        Join Room
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </motion.main>
  );
}
