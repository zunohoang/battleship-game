import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { SectionStatus } from '@/components/ui/SectionStatus';
import { BOARD_PRESETS, CONFIG_LIMITS, DEFAULT_GAME_CONFIG } from '@/constants/gameDefaults';
import { useOnlineRoom } from '@/hooks/useOnlineRoom';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import type { BoardConfig, ShipDefinition } from '@/types/game';

type PendingAction = 'none' | 'creating' | 'joining';
type CreateStep = 1 | 2;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
function genId() {
  return Math.random().toString(36).slice(2, 8);
}

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
  const [createStep, setCreateStep] = useState<CreateStep>(1);

  // --- fleet/board config state (phase 1) ---
  const [boardConfig, setBoardConfig] = useState<BoardConfig>(DEFAULT_GAME_CONFIG.boardConfig);
  const [ships, setShips] = useState<ShipDefinition[]>(DEFAULT_GAME_CONFIG.ships);
  const [newShipName, setNewShipName] = useState('');
  const [newShipSize, setNewShipSize] = useState(3);
  const [newShipCount, setNewShipCount] = useState(1);

  const boardCells = boardConfig.rows * boardConfig.cols;
  const totalCells = ships.reduce((s, sh) => s + sh.size * sh.count, 0);
  const isConfigValid = ships.length > 0 && totalCells > 0 && totalCells <= boardCells * 0.5;

  const handleUpdateShip = (id: string, patch: Partial<Omit<ShipDefinition, 'id'>>) => {
    setShips((prev) => prev.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)));
  };
  const handleRemoveShip = (id: string) => {
    setShips((prev) => prev.filter((sh) => sh.id !== id));
  };
  const handleAddShip = () => {
    const name = newShipName.trim();
    if (!name || ships.length >= CONFIG_LIMITS.ship.maxShipTypes) return;
    setShips((prev) => [...prev, { id: genId(), name, size: newShipSize, count: newShipCount }]);
    setNewShipName('');
    setNewShipSize(3);
    setNewShipCount(1);
  };

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

  const inputCls = 'ui-input h-8 w-full rounded-sm px-3 text-sm';
  const labelCls = 'grid gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--text-muted)';

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

        <div className='mt-5 grid gap-6 lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)]'>
          {/* ── Left: Create / Join ── */}
          <aside className='ui-panel rounded-md p-4 sm:p-5'>
            <h1 className='font-mono text-xl font-black uppercase tracking-[0.08em] text-(--text-main)'>
              Online Rooms
            </h1>
            <p className='mt-1 text-sm text-(--text-muted)'>
              Tạo phòng mới hoặc join phòng đã có.
            </p>

            {/* ── Create room: 2-step ── */}
            <div className='mt-5 rounded-sm border border-(--border-main) bg-black/10 p-3'>
              {/* Step indicator */}
              <div className='mb-3 flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => setCreateStep(1)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-black transition-colors ${
                    createStep === 1
                      ? 'border-[rgba(117,235,255,0.92)] bg-[rgba(34,211,238,0.18)] text-(--text-main)'
                      : isConfigValid
                        ? 'border-[rgba(63,203,232,0.48)] bg-[rgba(34,211,238,0.14)] text-(--accent-secondary)'
                        : 'border-[rgba(31,136,176,0.36)] text-(--text-muted)'
                  }`}
                >
                  {isConfigValid && createStep === 2 ? '✓' : '1'}
                </button>
                <div className='h-px flex-1 bg-[rgba(31,136,176,0.3)]' />
                <button
                  type='button'
                  disabled={!isConfigValid}
                  onClick={() => isConfigValid && setCreateStep(2)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-black transition-colors ${
                    createStep === 2
                      ? 'border-[rgba(117,235,255,0.92)] bg-[rgba(34,211,238,0.18)] text-(--text-main)'
                      : 'border-[rgba(31,136,176,0.36)] text-(--text-muted)'
                  }`}
                >
                  2
                </button>
                <p className='ml-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-(--accent-secondary)'>
                  {createStep === 1 ? 'Bản đồ & Đội tàu' : 'Tùy chọn phòng'}
                </p>
              </div>

              <AnimatePresence mode='wait'>
                {createStep === 1 ? (
                  <motion.div
                    key='step1'
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className='space-y-4'
                  >
                    {/* Board presets */}
                    <div>
                      <p className='mb-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-(--text-muted)'>Kích thước bản đồ</p>
                      <div className='grid grid-cols-3 gap-2'>
                        {BOARD_PRESETS.map((preset) => {
                          const active = boardConfig.rows === preset.value.rows && boardConfig.cols === preset.value.cols;
                          return (
                            <button
                              key={preset.label}
                              type='button'
                              onClick={() => setBoardConfig(preset.value)}
                              className={`rounded-sm border px-2 py-2 text-center transition-colors ${
                                active
                                  ? 'border-[rgba(117,235,255,0.95)] bg-[rgba(34,211,238,0.16)] text-(--text-main)'
                                  : 'border-[rgba(31,136,176,0.36)] bg-[rgba(5,19,30,0.72)] text-(--text-muted) hover:text-(--text-main)'
                              }`}
                            >
                              <p className='font-mono text-xs font-bold'>{preset.label}</p>
                            </button>
                          );
                        })}
                      </div>
                      <p className='mt-2 text-xs text-(--text-subtle)'>
                        Ô trống: <span className='font-bold text-(--text-muted)'>{boardCells}</span>
                        &nbsp;·&nbsp;Đội tàu dùng: <span className={totalCells > boardCells * 0.5 ? 'font-bold text-[rgba(255,120,100,0.9)]' : 'font-bold text-(--accent-secondary)'}>{totalCells}</span>
                        &nbsp;/ tối đa {Math.floor(boardCells * 0.5)}
                      </p>
                    </div>

                    {/* Ship list */}
                    <div>
                      <p className='mb-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-(--text-muted)'>Đội tàu ({ships.length})</p>

                      {ships.length === 0 && (
                        <p className='rounded-sm border border-[rgba(141,63,71,0.62)] bg-[rgba(43,16,22,0.82)] px-3 py-2 text-xs font-semibold text-[#ffb4b4]'>
                          Chưa có tàu nào — hãy thêm ít nhất 1 tàu.
                        </p>
                      )}

                      <div className='space-y-1'>
                        {ships.map((sh) => (
                          <div
                            key={sh.id}
                            className='rounded-sm border border-[rgba(31,136,176,0.36)] bg-[rgba(5,19,30,0.72)] px-3 py-2'
                          >
                            <div className='grid grid-cols-[minmax(0,1fr)_60px_52px_auto] items-end gap-2'>
                              <label className={labelCls}>
                                Tên
                                <input
                                  type='text'
                                  value={sh.name}
                                  onChange={(e) => handleUpdateShip(sh.id, { name: e.target.value })}
                                  className={inputCls}
                                />
                              </label>
                              <label className={labelCls}>
                                Cỡ
                                <input
                                  type='number'
                                  min={CONFIG_LIMITS.ship.minSize}
                                  max={CONFIG_LIMITS.ship.maxSize}
                                  value={sh.size}
                                  onChange={(e) => handleUpdateShip(sh.id, { size: clamp(parseInt(e.target.value, 10), CONFIG_LIMITS.ship.minSize, CONFIG_LIMITS.ship.maxSize) })}
                                  className={inputCls}
                                />
                              </label>
                              <label className={labelCls}>
                                SL
                                <input
                                  type='number'
                                  min={CONFIG_LIMITS.ship.minCount}
                                  max={CONFIG_LIMITS.ship.maxCount}
                                  value={sh.count}
                                  onChange={(e) => handleUpdateShip(sh.id, { count: clamp(parseInt(e.target.value, 10), CONFIG_LIMITS.ship.minCount, CONFIG_LIMITS.ship.maxCount) })}
                                  className={inputCls}
                                />
                              </label>
                              <Button
                                variant='danger'
                                onClick={() => handleRemoveShip(sh.id)}
                                className='h-8 px-2 text-[10px]'
                              >
                                ✕
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add ship row */}
                      {ships.length < CONFIG_LIMITS.ship.maxShipTypes && (
                        <div className='mt-2 rounded-sm border border-dashed border-[rgba(63,203,232,0.48)] bg-[rgba(7,32,46,0.4)] px-3 py-2'>
                          <p className='mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--text-muted)'>Thêm tàu mới</p>
                          <div className='grid grid-cols-[minmax(0,1fr)_60px_52px_auto] items-end gap-2'>
                            <label className={labelCls}>
                              Tên
                              <input
                                type='text'
                                placeholder='Tên tàu'
                                value={newShipName}
                                onChange={(e) => setNewShipName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddShip()}
                                className={inputCls}
                              />
                            </label>
                            <label className={labelCls}>
                              Cỡ
                              <input
                                type='number'
                                min={CONFIG_LIMITS.ship.minSize}
                                max={CONFIG_LIMITS.ship.maxSize}
                                value={newShipSize}
                                onChange={(e) => setNewShipSize(clamp(parseInt(e.target.value, 10), CONFIG_LIMITS.ship.minSize, CONFIG_LIMITS.ship.maxSize))}
                                className={inputCls}
                              />
                            </label>
                            <label className={labelCls}>
                              SL
                              <input
                                type='number'
                                min={1}
                                max={CONFIG_LIMITS.ship.maxCount}
                                value={newShipCount}
                                onChange={(e) => setNewShipCount(clamp(parseInt(e.target.value, 10), 1, CONFIG_LIMITS.ship.maxCount))}
                                className={inputCls}
                              />
                            </label>
                            <Button
                              variant='primary'
                              onClick={handleAddShip}
                              disabled={!newShipName.trim()}
                              className='h-8 px-2 text-[10px]'
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reset + Next */}
                    <div className='flex items-center justify-between gap-2 border-t border-[rgba(31,136,176,0.28)] pt-3'>
                      <Button
                        variant='danger'
                        onClick={() => {
                          setBoardConfig(DEFAULT_GAME_CONFIG.boardConfig);
                          setShips(DEFAULT_GAME_CONFIG.ships);
                        }}
                        className='h-8 px-3 text-[10px]'
                      >
                        Đặt lại
                      </Button>
                      <Button
                        variant='primary'
                        disabled={!isConfigValid}
                        onClick={() => setCreateStep(2)}
                        className='h-8 px-4 text-[10px]'
                      >
                        Tiếp theo →
                      </Button>
                    </div>

                    {!isConfigValid && ships.length > 0 && (
                      <p className='text-xs font-semibold text-[#ffb4b4]'>
                        Tổng ô tàu vượt quá 50% bản đồ. Giảm số lượng/cỡ tàu.
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key='step2'
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    className='space-y-3'
                  >
                    {/* Summary */}
                    <div className='rounded-sm border border-[rgba(63,203,232,0.3)] bg-[rgba(7,32,46,0.5)] px-3 py-2 text-xs text-(--text-muted) space-y-1'>
                      <p>Bản đồ: <span className='font-bold text-(--text-main)'>{boardConfig.rows} × {boardConfig.cols}</span></p>
                      <p>Tàu: <span className='font-bold text-(--text-main)'>{ships.length} loại</span> · Tổng {totalCells} ô</p>
                      <button
                        type='button'
                        onClick={() => setCreateStep(1)}
                        className='mt-1 text-[rgba(34,211,238,0.8)] underline-offset-2 hover:underline'
                      >
                        ← Chỉnh lại
                      </button>
                    </div>

                    <p className='font-mono text-[10px] font-black uppercase tracking-[0.2em] text-(--text-muted)'>Loại phòng</p>
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
                      className='h-11 w-full'
                      onClick={() => {
                        setPendingAction('creating');
                        createRoom({ visibility, boardConfig, ships });
                      }}
                    >
                      {pendingAction === 'creating' ? 'Đang tạo...' : 'Tạo phòng'}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Join by code ── */}
            <div className='mt-4 space-y-3 rounded-sm border border-(--border-main) bg-black/10 p-3'>
              <p className='ui-data-label'>Vào phòng bằng mã</p>
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
                {pendingAction === 'joining' ? 'Đang vào...' : 'Vào phòng'}
              </Button>
            </div>

            <div className='mt-4 flex gap-2'>
              <Button className='h-10' onClick={() => listRooms()}>
                Làm mới
              </Button>
              <Button className='h-10' onClick={() => navigate('/home')}>
                Quay lại
              </Button>
            </div>

            {lastError ? (
              <p className='mt-4 rounded-sm border border-[rgba(220,60,60,0.5)] bg-[rgba(160,30,30,0.2)] px-3 py-2 text-xs text-[rgba(255,170,170,0.95)]'>
                {lastError}
              </p>
            ) : null}
          </aside>

          {/* ── Right: Public room list ── */}
          <section className='ui-panel rounded-md p-4 sm:p-5'>
            <div className='flex items-center justify-between gap-3'>
              <h2 className='font-mono text-lg font-black uppercase tracking-[0.08em] text-(--text-main)'>
                Phòng công khai
              </h2>
              <span className='ui-data-label'>{rooms.length} phòng</span>
            </div>

            <div className='mt-4 grid gap-3'>
              {rooms.length === 0 ? (
                <div className='rounded-sm border border-(--border-main) bg-black/10 px-4 py-6 text-sm text-(--text-muted)'>
                  Chưa có phòng nào. Hãy tạo phòng và chờ đối thủ.
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
                        Vào phòng
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
