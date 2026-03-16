import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useOnlineRoom } from '@/hooks/useOnlineRoom';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import type { RoomSnapshot } from '@/types/game';

type PendingAction = 'none' | 'creating' | 'joining';
type Phase1Filter = 'all' | 'ready' | 'pending';
type OccupancyFilter = 'all' | 'empty' | 'full';
type SortFilter = 'newest' | 'oldest' | 'roomCode';

type RoomFilters = {
  phase1: Phase1Filter;
  occupancy: OccupancyFilter;
  sort: SortFilter;
};

const DEFAULT_FILTERS: RoomFilters = {
  phase1: 'all',
  occupancy: 'all',
  sort: 'newest',
};

function sortRooms(rooms: RoomSnapshot[], sort: SortFilter): RoomSnapshot[] {
  const next = [...rooms];

  if (sort === 'roomCode') {
    return next.sort((left, right) => left.roomCode.localeCompare(right.roomCode));
  }

  return next.sort((left, right) => {
    const leftTime = new Date(left.updatedAt).getTime();
    const rightTime = new Date(right.updatedAt).getTime();
    return sort === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
  });
}

function isPhase1Pending(room: RoomSnapshot): boolean {
  return !room.currentMatchId;
}

function isRoomFull(room: RoomSnapshot, currentUserId: string | null): boolean {
  return !!room.guestId && room.guestId !== currentUserId;
}

function isOwnRoom(room: RoomSnapshot, currentUserId: string | null): boolean {
  return room.ownerId === currentUserId || room.guestId === currentUserId;
}

export function GameRoomsPage() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useGlobalContext();
  const currentUserId = user?.id ?? null;
  const {
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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<RoomFilters>(DEFAULT_FILTERS);

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
    if (!room || pendingAction === 'none') {
      return;
    }

    navigate('/game/waiting', {
      state: {
        roomId: room.roomId,
        matchId: match?.id,
      },
    });
  }, [match?.id, navigate, pendingAction, room]);

  const filteredRooms = useMemo(() => {
    const next = rooms.filter((openRoom) => {
      if (filters.phase1 === 'ready' && isPhase1Pending(openRoom)) {
        return false;
      }

      if (filters.phase1 === 'pending' && !isPhase1Pending(openRoom)) {
        return false;
      }

      const roomHasGuest = !!openRoom.guestId;
      if (filters.occupancy === 'empty' && roomHasGuest) {
        return false;
      }

      if (filters.occupancy === 'full' && !roomHasGuest) {
        return false;
      }

      return true;
    });

    return sortRooms(next, filters.sort);
  }, [filters, rooms]);

  const canJoinByCode = roomCode.trim().length >= 4;
  const toggleClassName =
    'cursor-pointer ui-button-shell h-10 rounded-sm border px-3 text-xs font-bold tracking-[0.14em] uppercase transition-colors';

  return (
    <motion.main
      className='relative min-h-screen overflow-hidden px-4 py-5 text-(--text-main) sm:px-8'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className='ui-page-bg -z-20' />
      <div className='absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(50,217,255,0.08),transparent_38%)]' />

      <section className='ui-hud-shell mx-auto flex min-h-[calc(100vh-2.5rem)] w-full flex-col rounded-md p-4 sm:p-6'>
        <div className='grid min-h-0 flex-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]'>
          <aside className='ui-panel flex min-h-0 flex-col rounded-md p-4 sm:p-5'>
            <div>
              <h1 className='font-mono text-xl font-black uppercase tracking-[0.08em] text-(--text-main)'>
                Online Rooms
              </h1>
              <p className='mt-1 text-sm text-(--text-muted)'>
                Create a room, share the code, then finish phase 1 from the waiting room.
              </p>
            </div>

            <div className='ui-subpanel mt-5 space-y-4 rounded-sm p-4'>
              <div>
                <p className='ui-data-label'>Room visibility</p>
                <div className='mt-3 grid grid-cols-2 gap-2'>
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
              </div>

              <div className='rounded-sm border border-[rgba(63,203,232,0.28)] bg-[rgba(7,28,38,0.78)] px-3 py-3 text-sm text-(--text-muted)'>
                Phase 1 is now configured in the waiting room by the host before anyone can join.
              </div>

              <Button
                variant='primary'
                className='h-11'
                onClick={() => {
                  setPendingAction('creating');
                  createRoom({ visibility });
                }}
              >
                {pendingAction === 'creating' ? 'Creating...' : 'Create Room'}
              </Button>
            </div>

            <div className='ui-subpanel mt-4 space-y-3 rounded-sm p-4'>
              <p className='ui-data-label'>Join by code</p>
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
                {pendingAction === 'joining' ? 'Joining...' : 'Join Room'}
              </Button>
            </div>

            <div className='mt-auto pt-4'>
              <div className='flex gap-2'>
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
            </div>
          </aside>

          <section className='ui-panel flex min-h-0 flex-col rounded-md p-4 sm:p-5'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <h2 className='font-mono text-lg font-black uppercase tracking-[0.08em] text-(--text-main)'>
                  Public Rooms
                </h2>
                <p className='mt-1 text-sm text-(--text-muted)'>
                  {filteredRooms.length} shown / {rooms.length} total
                </p>
              </div>

              <Button className='h-10 w-auto px-4' onClick={() => setIsFilterModalOpen(true)}>
                Filters
              </Button>
            </div>

            <div className='mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1'>
              {filteredRooms.length === 0 ? (
                <div className='ui-subpanel rounded-sm px-4 py-6 text-sm text-(--text-muted)'>
                  {rooms.length === 0
                    ? 'No public rooms yet. Create one and complete phase 1 in the waiting room.'
                    : 'No rooms match the selected filters.'}
                </div>
              ) : (
                filteredRooms.map((openRoom) => {
                  const pendingPhase1 = isPhase1Pending(openRoom);
                  const roomOwnedByUser = isOwnRoom(openRoom, currentUserId);
                  const roomIsFull = isRoomFull(openRoom, currentUserId);
                  const canOpenRoom = roomOwnedByUser || (!pendingPhase1 && !roomIsFull);

                  return (
                    <div
                      key={openRoom.roomId}
                      className='ui-subpanel rounded-sm px-4 py-4'
                    >
                      <div className='flex flex-wrap items-start justify-between gap-4'>
                        <div className='min-w-0 flex-1'>
                          <div className='flex flex-wrap items-center gap-3'>
                            <div>
                              <p className='ui-data-label'>Code</p>
                              <p className='font-mono text-lg font-black tracking-[0.14em] text-(--accent-secondary)'>
                                {openRoom.roomCode}
                              </p>
                            </div>
                            <span className='rounded-full border border-[rgba(63,203,232,0.32)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-(--text-muted)'>
                              {pendingPhase1 ? 'Phase 1 pending' : 'Phase 1 ready'}
                            </span>
                            <span className='rounded-full border border-[rgba(63,203,232,0.32)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-(--text-muted)'>
                              {openRoom.guestId ? 'Full' : 'Open'}
                            </span>
                          </div>

                          <div className='mt-3 grid gap-1 text-sm text-(--text-muted)'>
                            <p>Status: <span className='font-mono text-(--text-main)'>{openRoom.status}</span></p>
                            <p>
                              Access:{' '}
                              <span className='font-mono text-(--text-main)'>{openRoom.visibility}</span>
                            </p>
                            <p>
                              Updated:{' '}
                              <span className='font-mono text-(--text-main)'>
                                {new Date(openRoom.updatedAt).toLocaleString()}
                              </span>
                            </p>
                          </div>

                          <p className='mt-3 text-xs uppercase tracking-[0.16em] text-(--text-subtle)'>
                            {roomOwnedByUser
                              ? 'Your room is waiting for the next action.'
                              : pendingPhase1
                                ? 'Host is still configuring phase 1.'
                                : roomIsFull
                                  ? 'This room already has an opponent.'
                                  : 'Room is ready for an opponent to join.'}
                          </p>
                        </div>

                        <Button
                          className='h-10 w-40'
                          disabled={!canOpenRoom}
                          onClick={() => {
                            setPendingAction('joining');
                            joinRoom({ roomCode: openRoom.roomCode });
                          }}
                        >
                          {roomOwnedByUser
                            ? 'Open Room'
                            : pendingPhase1
                              ? 'Phase 1 Pending'
                              : roomIsFull
                                ? 'Room Full'
                                : 'Join Room'}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </section>

      <Modal
        isOpen={isFilterModalOpen}
        title='Room Filters'
        onClose={() => setIsFilterModalOpen(false)}
      >
        <div className='grid gap-4'>
          <div className='grid gap-2 text-sm font-semibold text-(--text-muted)'>
            <span>Phase 1</span>
            <div className='grid grid-cols-3 gap-2'>
              {([
                ['all', 'All'],
                ['ready', 'Ready'],
                ['pending', 'Pending'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type='button'
                  onClick={() => setFilters((current) => ({ ...current, phase1: value }))}
                  className={`${toggleClassName} ${
                    filters.phase1 === value ? 'ui-button-primary' : 'ui-button-default'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className='grid gap-2 text-sm font-semibold text-(--text-muted)'>
            <span>Occupancy</span>
            <div className='grid grid-cols-3 gap-2'>
              {([
                ['all', 'All'],
                ['empty', 'Open'],
                ['full', 'Full'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type='button'
                  onClick={() => setFilters((current) => ({ ...current, occupancy: value }))}
                  className={`${toggleClassName} ${
                    filters.occupancy === value ? 'ui-button-primary' : 'ui-button-default'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className='grid gap-2 text-sm font-semibold text-(--text-muted)'>
            <span>Sort</span>
            <div className='grid grid-cols-3 gap-2'>
              {([
                ['newest', 'Newest'],
                ['oldest', 'Oldest'],
                ['roomCode', 'Code'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type='button'
                  onClick={() => setFilters((current) => ({ ...current, sort: value }))}
                  className={`${toggleClassName} ${
                    filters.sort === value ? 'ui-button-primary' : 'ui-button-default'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className='flex gap-3'>
            <Button
              variant='primary'
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
              }}
            >
              Reset Filters
            </Button>
            <Button onClick={() => setIsFilterModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </motion.main>
  );
}
