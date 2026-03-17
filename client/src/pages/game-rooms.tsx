import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useOnlineRoom } from '@/hooks/useOnlineRoom';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import type {
  RoomListAccessState,
  RoomListOccupancy,
  RoomListSummary,
  RoomStatus,
} from '@/types/game';

type PendingAction = 'none' | 'creating' | 'joining';
type RoomFilterKey = 'status' | 'accessState' | 'occupancy';
type StatusFilter = 'all' | RoomStatus;
type AccessStateFilter = 'all' | RoomListAccessState;
type OccupancyFilter = 'all' | RoomListOccupancy;

type RoomFilters = {
  status: StatusFilter;
  accessState: AccessStateFilter;
  occupancy: OccupancyFilter;
};

type FilterOption = {
  value: string;
  label: string;
};

const DEFAULT_FILTERS: RoomFilters = {
  status: 'all',
  accessState: 'all',
  occupancy: 'all',
};

const columnGridClassName = 'grid min-w-[980px] grid-cols-[minmax(160px,0.7fr)_1px_minmax(150px,1fr)_1px_minmax(180px,1fr)_1px_minmax(132px,0.75fr)_1px_minmax(172px,1fr)] items-stretch gap-0';
const headerPanelClassName = 'cursor-pointer ui-button-shell ui-button-default flex h-15 w-full items-center rounded-sm border px-5 py-3 text-left md:px-6';
const rowCellClassName = 'flex h-10 min-w-0 items-center px-4 py-2';
const dividerClassName = 'h-full bg-[linear-gradient(180deg,rgba(63,203,232,0.06),rgba(63,203,232,0.34),rgba(63,203,232,0.06))]';

const statusLabelMap: Record<RoomStatus, string> = {
  waiting: 'Waiting',
  setup: 'Setup',
  in_game: 'In Game',
  finished: 'Finished',
  closed: 'Closed',
};

const accessStateLabelMap: Record<RoomListAccessState, string> = {
  setting_up: 'Setting Up',
  ready: 'Ready',
  playing: 'Playing',
};

const occupancyLabelMap: Record<RoomListOccupancy, string> = {
  '1/2': '1/2',
  '2/2': '2/2',
};

const statusOptions: FilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'setup', label: 'Setup' },
  { value: 'in_game', label: 'In Game' },
  { value: 'finished', label: 'Finished' },
  { value: 'closed', label: 'Closed' },
];

const accessStateOptions: FilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'setting_up', label: 'Setting Up' },
  { value: 'ready', label: 'Ready' },
  { value: 'playing', label: 'Playing' },
];

const occupancyOptions: FilterOption[] = [
  { value: 'all', label: 'All' },
  { value: '1/2', label: '1/2' },
  { value: '2/2', label: '2/2' },
];

function getRoomActionState(
  roomItem: RoomListSummary,
  pendingAction: PendingAction,
) {
  if (roomItem.actionKind === 'open') {
    return {
      label: pendingAction === 'joining' ? 'Joining...' : 'Join Room',
      disabled: pendingAction === 'joining',
    };
  }

  if (roomItem.occupancy === '2/2') {
    return {
      label: 'Room Full',
      disabled: true,
    };
  }

  if (!roomItem.phase1Config) {
    return {
      label: 'Phase 1 Pending',
      disabled: true,
    };
  }

  return {
    label: pendingAction === 'joining' ? 'Joining...' : 'Join Room',
    disabled: pendingAction === 'joining',
  };
}

function summarizeFleet(
  ships: NonNullable<RoomListSummary['phase1Config']>['ships'],
) {
  const totalCells = ships.reduce(
    (sum: number, ship) => sum + ship.size * ship.count,
    0,
  );
  return {
    shipTypes: ships.length,
    totalCells,
  };
}

function FilterHeader({
  label,
  currentLabel,
  isOpen,
  options,
  onToggle,
  onSelect,
}: {
  label: string;
  currentLabel: string;
  isOpen: boolean;
  options: FilterOption[];
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <div className='relative px-3'>
      <button
        type='button'
        className={headerPanelClassName}
        aria-expanded={isOpen}
        aria-haspopup='listbox'
        onClick={onToggle}
      >
        <div className='min-w-0 flex-1'>
          <p className='ui-data-label'>{label}</p>
          <p className='truncate font-mono text-lg font-black uppercase text-(--text-main)'>
            {currentLabel}
          </p>
        </div>
        <span
          aria-hidden='true'
          className='ml-3 flex h-5 w-5 items-center justify-center text-(--text-muted)'
        >
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {isOpen ? (
        <div className='ui-panel ui-panel-strong absolute left-0 top-full z-20 mt-2 w-full min-w-44 rounded-sm p-2 shadow-[0_12px_28px_rgba(2,12,20,0.28)]'>
          <div role='listbox' className='grid gap-1'>
            {options.map((option) => (
              <button
                key={option.value}
                type='button'
                onClick={() => onSelect(option.value)}
                className='cursor-pointer ui-button-shell ui-button-default rounded-sm border px-4 py-2 text-left text-xs font-bold uppercase tracking-[0.14em]'
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StaticHeaderCell({ label, value }: { label: string; value: string }) {
  return (
    <div className=''>
      <div className='flex h-15 w-full items-center rounded-sm px-5 py-3 text-left md:px-6'>
        <div className='min-w-0 flex-1'>
          <p className='ui-data-label'>{label}</p>
          <p className='truncate font-mono text-lg font-black uppercase text-(--text-main)'>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export function GameRoomsPage() {
  const navigate = useNavigate();
  const filterBarRef = useRef<HTMLDivElement | null>(null);
  const { isLoggedIn } = useGlobalContext();
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
  const [openFilter, setOpenFilter] = useState<RoomFilterKey | null>(null);
  const [filters, setFilters] = useState<RoomFilters>(DEFAULT_FILTERS);
  const [selectedRoomPreview, setSelectedRoomPreview] = useState<RoomListSummary | null>(null);

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

  useEffect(() => {
    if (!lastError || pendingAction === 'none') {
      return;
    }

    const resetPendingActionTimeoutId = window.setTimeout(() => {
      setPendingAction('none');
    }, 0);

    return () => {
      window.clearTimeout(resetPendingActionTimeoutId);
    };
  }, [lastError, pendingAction]);

  useEffect(() => {
    if (!openFilter) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!filterBarRef.current?.contains(event.target as Node)) {
        setOpenFilter(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenFilter(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openFilter]);

  const selectedRoom =
    selectedRoomPreview === null
      ? null
      : rooms.find((roomItem) => roomItem.roomId === selectedRoomPreview.roomId) ??
        selectedRoomPreview;

  const filteredRooms = useMemo(() => {
    return rooms.filter((openRoom) => {
      if (filters.status !== 'all' && openRoom.status !== filters.status) {
        return false;
      }

      if (
        filters.accessState !== 'all' &&
        openRoom.accessState !== filters.accessState
      ) {
        return false;
      }

      if (
        filters.occupancy !== 'all' &&
        openRoom.occupancy !== filters.occupancy
      ) {
        return false;
      }

      return true;
    });
  }, [filters, rooms]);

  const canJoinByCode = roomCode.trim().length >= 4;
  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.accessState !== 'all' ||
    filters.occupancy !== 'all';

  const handleRoomAction = (roomItem: RoomListSummary) => {
    setSelectedRoomPreview(null);
    setPendingAction('joining');
    joinRoom({ roomId: roomItem.roomId });
  };

  const handleRowPreview = (roomItem: RoomListSummary) => {
    setSelectedRoomPreview(roomItem);
  };

  const handleFilterSelect = (
    filterKey: RoomFilterKey,
    value: string,
  ) => {
    setFilters((current) => ({
      ...current,
      [filterKey]: value,
    }));
    setOpenFilter(null);
  };

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
                  Available Rooms
                </h2>
                <p className='mt-1 text-sm text-(--text-muted)'>
                  {filteredRooms.length} shown / {rooms.length} total
                </p>
              </div>

              <div className='flex gap-2'>
                <Button
                  className='h-10 w-auto px-4'
                  disabled={!hasActiveFilters}
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    setOpenFilter(null);
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            </div>

            <div className='mt-4 min-h-0 flex-1 overflow-auto'>
              <div className='min-w-[980px]'>
                <div ref={filterBarRef} className='ui-subpanel rounded-sm p-3'>
                  <div className={columnGridClassName}>
                    <StaticHeaderCell label='RoomCode' value='Code' />

                    <div aria-hidden='true' className={dividerClassName} />

                    <FilterHeader
                      label='Status'
                      currentLabel={
                        filters.status === 'all'
                          ? 'All'
                          : statusLabelMap[filters.status]
                      }
                      isOpen={openFilter === 'status'}
                      options={statusOptions}
                      onToggle={() =>
                        setOpenFilter((current) =>
                          current === 'status' ? null : 'status',
                        )
                      }
                      onSelect={(value) => {
                        handleFilterSelect('status', value);
                      }}
                    />

                    <div aria-hidden='true' className={dividerClassName} />

                    <FilterHeader
                      label='AccessState'
                      currentLabel={
                        filters.accessState === 'all'
                          ? 'All'
                          : accessStateLabelMap[filters.accessState]
                      }
                      isOpen={openFilter === 'accessState'}
                      options={accessStateOptions}
                      onToggle={() =>
                        setOpenFilter((current) =>
                          current === 'accessState' ? null : 'accessState',
                        )
                      }
                      onSelect={(value) => {
                        handleFilterSelect('accessState', value);
                      }}
                    />

                    <div aria-hidden='true' className={dividerClassName} />

                    <FilterHeader
                      label='Occupancy'
                      currentLabel={
                        filters.occupancy === 'all'
                          ? 'All'
                          : occupancyLabelMap[filters.occupancy]
                      }
                      isOpen={openFilter === 'occupancy'}
                      options={occupancyOptions}
                      onToggle={() =>
                        setOpenFilter((current) =>
                          current === 'occupancy' ? null : 'occupancy',
                        )
                      }
                      onSelect={(value) => {
                        handleFilterSelect('occupancy', value);
                      }}
                    />

                    <div aria-hidden='true' className={dividerClassName} />

                    <StaticHeaderCell label='Join' value='Action' />
                  </div>
                </div>

                <div className='themed-scrollbar mt-3 flex min-h-0 flex-col gap-2 overflow-y-auto pr-1'>
                  {filteredRooms.length === 0 ? (
                    <div className='ui-subpanel rounded-sm px-4 py-6 text-sm text-(--text-muted)'>
                      {rooms.length === 0
                        ? 'No rooms are available right now. Create one or join by code.'
                        : 'No rooms match the selected filters.'}
                    </div>
                  ) : (
                    filteredRooms.map((roomItem) => {
                      const actionState = getRoomActionState(
                        roomItem,
                        pendingAction,
                      );

                      return (
                        <div
                          key={roomItem.roomId}
                          role='button'
                          tabIndex={0}
                          className='ui-subpanel cursor-pointer rounded-sm p-3 transition-colors duration-150 hover:border-[rgba(77,223,255,0.44)] focus-visible:border-[rgba(90,229,255,0.65)] focus-visible:outline-none'
                          onClick={() => handleRowPreview(roomItem)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleRowPreview(roomItem);
                            }
                          }}
                        >
                          <div className={columnGridClassName}>
                            <div className={rowCellClassName}>
                              <p className='truncate font-mono text-sm font-bold uppercase tracking-[0.12em] text-(--text-main)'>
                                {roomItem.roomCode}
                              </p>
                            </div>

                            <div aria-hidden='true' className={dividerClassName} />

                            <div className={rowCellClassName}>
                              <p className='font-mono text-sm font-bold uppercase tracking-[0.12em] text-(--text-main)'>
                                {statusLabelMap[roomItem.status]}
                              </p>
                            </div>

                            <div aria-hidden='true' className={dividerClassName} />

                            <div className={rowCellClassName}>
                              <p className='font-mono text-sm font-bold uppercase tracking-[0.12em] text-(--text-main)'>
                                {accessStateLabelMap[roomItem.accessState]}
                              </p>
                            </div>

                            <div aria-hidden='true' className={dividerClassName} />

                            <div className={rowCellClassName}>
                              <p className='font-mono text-sm font-bold uppercase tracking-[0.12em] text-(--text-main)'>
                                {roomItem.occupancy}
                              </p>
                            </div>

                            <div aria-hidden='true' className={dividerClassName} />

                            <div className={`${rowCellClassName} justify-start`}>
                              <Button
                                className='h-10 w-full'
                                disabled={actionState.disabled}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRoomAction(roomItem);
                                }}
                              >
                                {actionState.label}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <Modal
        isOpen={selectedRoom !== null}
        title='Phase 1 Intel'
        onClose={() => setSelectedRoomPreview(null)}
        surfaceClassName='max-w-2xl'
      >
        {selectedRoom ? (
          <div className='space-y-4'>
            <div className='ui-subpanel rounded-sm p-4'>
              <p className='ui-data-label'>Room code</p>
              <p className='mt-2 font-mono text-xl font-black uppercase tracking-[0.08em] text-(--text-main)'>
                {selectedRoom.roomCode}
              </p>
              <p className='mt-2 text-sm text-(--text-muted)'>
                Previewing the host phase 1 configuration currently published for this room.
              </p>
            </div>

            {selectedRoom.phase1Config ? (
              <>
                <div className='grid gap-3 sm:grid-cols-4'>
                  <div className='ui-subpanel rounded-sm p-4'>
                    <p className='ui-data-label'>Board</p>
                    <p className='mt-2 font-mono text-lg font-black uppercase tracking-[0.08em] text-(--text-main)'>
                      {selectedRoom.phase1Config.boardConfig.rows} x {selectedRoom.phase1Config.boardConfig.cols}
                    </p>
                  </div>

                  <div className='ui-subpanel rounded-sm p-4'>
                    <p className='ui-data-label'>Fleet types</p>
                    <p className='mt-2 font-mono text-lg font-black uppercase tracking-[0.08em] text-(--text-main)'>
                      {summarizeFleet(selectedRoom.phase1Config.ships).shipTypes}
                    </p>
                  </div>

                  <div className='ui-subpanel rounded-sm p-4'>
                    <p className='ui-data-label'>Fleet cells</p>
                    <p className='mt-2 font-mono text-lg font-black uppercase tracking-[0.08em] text-(--text-main)'>
                      {summarizeFleet(selectedRoom.phase1Config.ships).totalCells}
                    </p>
                  </div>

                  <div className='ui-subpanel rounded-sm p-4'>
                    <p className='ui-data-label'>Turn timer</p>
                    <p className='mt-2 font-mono text-lg font-black uppercase tracking-[0.08em] text-(--text-main)'>
                      {selectedRoom.phase1Config.turnTimerSeconds}s
                    </p>
                  </div>
                </div>

                <div className='ui-subpanel rounded-sm p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <p className='ui-data-label'>Host fleet configuration</p>
                    <p className='font-mono text-xs font-bold uppercase tracking-[0.14em] text-(--text-muted)'>
                      {statusLabelMap[selectedRoom.status]} / {accessStateLabelMap[selectedRoom.accessState]}
                    </p>
                  </div>

                  <div className='mt-3 grid gap-2'>
                    {selectedRoom.phase1Config.ships.map((ship) => (
                      <div
                        key={ship.id}
                        className='flex items-center justify-between rounded-sm border border-[rgba(63,203,232,0.22)] bg-[rgba(7,28,38,0.72)] px-4 py-3'
                      >
                        <div>
                          <p className='font-mono text-sm font-black uppercase tracking-[0.12em] text-(--text-main)'>
                            {ship.name}
                          </p>
                          <p className='mt-1 text-xs uppercase tracking-[0.12em] text-(--text-muted)'>
                            Size {ship.size}
                          </p>
                        </div>
                        <p className='font-mono text-sm font-bold uppercase tracking-[0.12em] text-(--accent-secondary)'>
                          x{ship.count}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className='ui-subpanel rounded-sm p-4'>
                <p className='ui-data-label'>Phase 1 status</p>
                <p className='mt-2 font-mono text-lg font-black uppercase tracking-[0.08em] text-(--text-main)'>
                  Pending
                </p>
                <p className='mt-2 text-sm text-(--text-muted)'>
                  The host has not published a phase 1 configuration for this room yet.
                </p>
              </div>
            )}

            <div className='flex justify-end'>
              {(() => {
                const actionState = getRoomActionState(selectedRoom, pendingAction);

                return (
                  <Button
                    className='h-11 w-full sm:w-52'
                    disabled={actionState.disabled}
                    onClick={() => handleRoomAction(selectedRoom)}
                  >
                    {actionState.label}
                  </Button>
                );
              })()}
            </div>
          </div>
        ) : null}
      </Modal>
    </motion.main>
  );
}
