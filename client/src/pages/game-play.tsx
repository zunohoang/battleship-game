import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SlidersHorizontal } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SettingsModal } from '@/components/modal';
import { Button } from '@/components/ui/Button';
import { BattleBoard } from '@/components/game/BattleBoard';
import { useModalState } from '@/hooks/useModalState';
import { useSettings } from '@/hooks/useSettings';
import type {
  AiDifficulty,
  BoardConfig,
  GameConfig,
  GameMode,
  GamePhase,
  GameResult,
  PlacedShip,
  ShipDefinition,
  Shot,
  TurnOwner,
} from '@/types/game';
import {
  buildOccupiedMap,
  buildRandomPlacements,
  buildShipInstances,
  cellKey,
  getShipCells,
  instanceKey,
} from '@/utils/placementUtils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TURN_TIME = 30;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type LogEntry = {
  id: number;
  timestamp: string;
  message: string;
  highlight?: 'hit' | 'miss' | 'info';
};

type LocationState = {
  mode?: GameMode;
  config?: GameConfig;
  placements?: PlacedShip[];
  botPlacements?: PlacedShip[];
  aiDifficulty?: AiDifficulty;
};

type StatRowProps = {
  label: string;
  value: string | number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let _logId = 0;

function makeLog(message: string, highlight?: LogEntry['highlight']): LogEntry {
  const d = new Date();
  const ts = [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
  return { id: _logId++, timestamp: ts, message, highlight };
}

function toCoordLabel(x: number, y: number): string {
  let value = x;
  let label = '';
  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return `${label}-${y + 1}`;
}

function checkAllSunk(
  placements: PlacedShip[],
  shipsById: Map<string, ShipDefinition>,
  shots: Shot[],
): boolean {
  const hitKeys = new Set(shots.filter((s) => s.isHit).map((s) => cellKey(s.x, s.y)));
  for (const placement of placements) {
    const ship = shipsById.get(placement.definitionId);
    if (!ship) continue;
    for (const cell of getShipCells(placement, ship.size)) {
      if (!hitKeys.has(cellKey(cell.x, cell.y))) return false;
    }
  }
  return true;
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className='flex items-center justify-between gap-4 border-b border-[rgba(31,136,176,0.18)] py-1.5'>
      <span className='font-mono text-[10px] uppercase tracking-[0.14em] text-(--text-muted)'>{label}</span>
      <span className='font-mono text-sm font-bold text-(--accent-secondary)'>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bot AI strategies
// ---------------------------------------------------------------------------
function botFireRandom(
  boardConfig: BoardConfig,
  shots: Shot[],
): { x: number; y: number } | null {
  const shotSet = new Set(shots.map((s) => cellKey(s.x, s.y)));
  const candidates: { x: number; y: number }[] = [];
  for (let y = 0; y < boardConfig.rows; y++) {
    for (let x = 0; x < boardConfig.cols; x++) {
      if (!shotSet.has(cellKey(x, y))) candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function botFireLearning(
  boardConfig: BoardConfig,
  shots: Shot[],
): { x: number; y: number } | null {
  const shotSet = new Set(shots.map((s) => cellKey(s.x, s.y)));
  const hits = shots.filter((s) => s.isHit);
  const adj: { x: number; y: number }[] = [];
  for (const hit of hits) {
    for (const n of [
      { x: hit.x - 1, y: hit.y },
      { x: hit.x + 1, y: hit.y },
      { x: hit.x, y: hit.y - 1 },
      { x: hit.x, y: hit.y + 1 },
    ]) {
      if (
        n.x >= 0 &&
        n.x < boardConfig.cols &&
        n.y >= 0 &&
        n.y < boardConfig.rows &&
        !shotSet.has(cellKey(n.x, n.y))
      ) {
        adj.push(n);
      }
    }
  }
  if (adj.length > 0) return adj[Math.floor(Math.random() * adj.length)];
  return botFireRandom(boardConfig, shots);
}

function botFireProbability(
  boardConfig: BoardConfig,
  ships: ShipDefinition[],
  shots: Shot[],
): { x: number; y: number } | null {
  const shotSet = new Set(shots.map((s) => cellKey(s.x, s.y)));
  const hitSet = new Set(shots.filter((s) => s.isHit).map((s) => cellKey(s.x, s.y)));
  const missSet = new Set(shots.filter((s) => !s.isHit).map((s) => cellKey(s.x, s.y)));
  const density = new Map<string, number>();

  for (const ship of ships) {
    const size = ship.size;
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const maxCol = orientation === 'horizontal' ? boardConfig.cols - size : boardConfig.cols - 1;
      const maxRow = orientation === 'vertical' ? boardConfig.rows - size : boardConfig.rows - 1;
      for (let y = 0; y <= maxRow; y++) {
        for (let x = 0; x <= maxCol; x++) {
          let valid = true;
          let hasHit = false;
          for (let i = 0; i < size; i++) {
            const cx = x + (orientation === 'horizontal' ? i : 0);
            const cy = y + (orientation === 'vertical' ? i : 0);
            const k = cellKey(cx, cy);
            if (missSet.has(k)) { valid = false; break; }
            if (hitSet.has(k)) hasHit = true;
          }
          if (!valid) continue;
          const weight = hasHit ? 3 : 1;
          for (let i = 0; i < size; i++) {
            const cx = x + (orientation === 'horizontal' ? i : 0);
            const cy = y + (orientation === 'vertical' ? i : 0);
            const k = cellKey(cx, cy);
            if (!shotSet.has(k)) density.set(k, (density.get(k) ?? 0) + weight);
          }
        }
      }
    }
  }

  if (density.size === 0) return botFireRandom(boardConfig, shots);
  let max = 0;
  let best: { x: number; y: number } | null = null;
  for (const [key, score] of density.entries()) {
    if (score > max) {
      max = score;
      const [xs, ys] = key.split(',');
      best = { x: parseInt(xs, 10), y: parseInt(ys, 10) };
    }
  }
  return best ?? botFireRandom(boardConfig, shots);
}

function getBotShot(
  boardConfig: BoardConfig,
  ships: ShipDefinition[],
  shots: Shot[],
  difficulty: AiDifficulty,
): { x: number; y: number } | null {
  if (difficulty === 'learning') return botFireLearning(boardConfig, shots);
  if (difficulty === 'probability') return botFireProbability(boardConfig, ships, shots);
  return botFireRandom(boardConfig, shots);
}

// ---------------------------------------------------------------------------
// Fleet health strip (above player board)
// ---------------------------------------------------------------------------
function FleetHealthStrip({
  placements,
  shipsById,
  damagingShots,
  cellSizePx = 16,
}: {
  placements: PlacedShip[];
  shipsById: Map<string, ShipDefinition>;
  damagingShots: Shot[];
  cellSizePx?: number;
}) {
  const hitKeys = useMemo(
    () => new Set(damagingShots.filter((s) => s.isHit).map((s) => cellKey(s.x, s.y))),
    [damagingShots],
  );

  const shipStrips = useMemo(
    () =>
      placements.map((placement) => {
        const ship = shipsById.get(placement.definitionId);
        if (!ship) return null;
        const cells = getShipCells(placement, ship.size);
        const isHit = cells.map((c) => hitKeys.has(cellKey(c.x, c.y)));
        return {
          key: instanceKey(placement.definitionId, placement.instanceIndex),
          size: ship.size,
          isHit,
        };
      }).filter((s): s is NonNullable<typeof s> => s !== null),
    [placements, shipsById, hitKeys],
  );

  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      {shipStrips.map((strip) => (
        <div key={strip.key} className='flex gap-px'>
          {strip.isHit.map((hit, i) => (
            <div
              key={i}
              className={`rounded-sm transition-colors ${
                hit
                  ? 'bg-[rgba(220,60,60,0.8)]'
                  : 'bg-[rgba(34,211,238,0.65)] shadow-[0_0_4px_rgba(34,211,238,0.4)]'
              }`}
              style={{ width: cellSizePx, height: Math.round(cellSizePx * 0.6) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Game Over overlay (minimizable)
// ---------------------------------------------------------------------------
function GameOverOverlay({
  result,
  onPlayAgain,
}: {
  result: GameResult;
  onPlayAgain: () => void;
}) {
  const { t } = useTranslation();
  const won = result === 'player_wins';
  const [minimized, setMinimized] = useState(false);

  if (minimized) {
    return (
      <motion.button
        type='button'
        onClick={() => setMinimized(false)}
        className={`absolute bottom-3 left-3 z-50 flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] backdrop-blur-sm transition-colors ${
          won
            ? 'border-[rgba(117,235,255,0.7)] bg-[rgba(34,211,238,0.18)] text-(--accent-secondary) hover:bg-[rgba(34,211,238,0.28)]'
            : 'border-[rgba(220,60,60,0.6)] bg-[rgba(160,30,30,0.25)] text-[rgba(220,80,80,0.95)] hover:bg-[rgba(160,30,30,0.4)]'
        }`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.22 }}
      >
        <span>{won ? '★' : '✕'}</span>
        <span>{won ? t('gameBattle.result.victory') : t('gameBattle.result.defeat')}</span>
        <span className='opacity-60'>▲</span>
      </motion.button>
    );
  }

  return (
    <motion.div
      className='absolute inset-0 z-50 flex items-center justify-center'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className='absolute inset-0 bg-[rgba(2,9,18,0.82)] backdrop-blur-sm' />
      <motion.div
        className='ui-panel ui-panel-strong relative z-10 w-full rounded-md px-6 py-8 text-center'
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          type='button'
          onClick={() => setMinimized(true)}
          className='absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-sm border border-[rgba(31,136,176,0.36)] text-[13px] text-(--text-muted) transition-colors hover:border-[rgba(117,235,255,0.5)] hover:text-(--text-main)'
          title={t('gameBattle.minimize')}
        >
          ─
        </button>
        <p className='ui-data-label mb-3'>
          {won ? t('gameBattle.result.victorySubtitle') : t('gameBattle.result.defeatSubtitle')}
        </p>
        <h2
          className={`font-mono text-2xl font-black uppercase tracking-widest sm:text-3xl ${
            won ? 'text-[rgba(34,211,238,0.95)]' : 'text-[rgba(220,60,60,0.95)]'
          }`}
        >
          {won ? t('gameBattle.result.victory') : t('gameBattle.result.defeat')}
        </h2>
        <p className='mt-4 text-sm leading-7 text-(--text-muted)'>
          {won ? t('gameBattle.result.victoryDesc') : t('gameBattle.result.defeatDesc')}
        </p>
        <div className='mt-8 flex justify-center'>
          <Button variant='primary' onClick={onPlayAgain} className='h-10 px-6'>
            {t('gameBattle.result.playAgain')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Statistics overlay
// ---------------------------------------------------------------------------
function StatsOverlay({
  playerShots,
  botShots,
  isBotVBot,
  onClose,
}: {
  playerShots: Shot[];
  botShots: Shot[];
  isBotVBot: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const calc = (shots: Shot[]) => {
    const hits = shots.filter((s) => s.isHit).length;
    const misses = shots.length - hits;
    const acc = shots.length ? Math.round((hits / shots.length) * 100) : 0;
    return { total: shots.length, hits, misses, acc };
  };

  const you = calc(playerShots);
  const enemy = calc(botShots);

  return (
    <motion.div
      className='absolute inset-0 z-40 flex flex-col'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className='absolute inset-0 bg-[rgba(2,9,18,0.88)] backdrop-blur-sm' />
      <div className='relative z-10 flex h-full flex-col gap-3 overflow-y-auto p-4'>
        <div className='flex items-center justify-between'>
          <p className='font-mono text-[11px] font-black uppercase tracking-[0.24em] text-(--accent-secondary)'>
            {t('gameBattle.stats.title')}
          </p>
          <button
            type='button'
            onClick={onClose}
            className='cursor-pointer flex h-6 w-6 items-center justify-center rounded-sm border border-[rgba(31,136,176,0.36)] text-[11px] text-(--text-muted) transition-colors hover:border-[rgba(255,100,80,0.5)] hover:text-[rgba(255,100,80,0.9)]'
          >
            ✕
          </button>
        </div>
        <div>
          <p className='mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-(--text-subtle)'>
            {isBotVBot ? t('gameBattle.botAFleet') : t('gameBattle.stats.youLabel')}
          </p>
          <StatRow label={t('gameBattle.stats.shots')} value={you.total} />
          <StatRow label={t('gameBattle.stats.hits')} value={you.hits} />
          <StatRow label={t('gameBattle.stats.misses')} value={you.misses} />
          <StatRow label={t('gameBattle.stats.accuracy')} value={`${you.acc}%`} />
        </div>
        <div>
          <p className='mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-(--text-subtle)'>
            {isBotVBot ? t('gameBattle.botBFleet') : t('gameBattle.stats.enemyLabel')}
          </p>
          <StatRow label={t('gameBattle.stats.shots')} value={enemy.total} />
          <StatRow label={t('gameBattle.stats.hits')} value={enemy.hits} />
          <StatRow label={t('gameBattle.stats.misses')} value={enemy.misses} />
          <StatRow label={t('gameBattle.stats.accuracy')} value={`${enemy.acc}%`} />
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function GamePlayPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { playBackgroundMusic, stopBackgroundMusic, fadeOutBackgroundMusic } = useSettings();
  const { modalMode, isModalOpen, openModal, closeModal } = useModalState<'settings'>();
  const location = useLocation();
  const state = location.state as LocationState | null;

  // Guard: redirect if no game state
  const hasState = !!(state?.config && state?.placements);
  useEffect(() => {
    if (!hasState) navigate('/game/setup', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasState) return null;

  const mode = state!.mode ?? 'bot';
  const config = state!.config!;
  const playerPlacements = state!.placements!;
  const aiDifficulty = state!.aiDifficulty ?? 'random';
  const isBotVBot = mode === 'botvbot';

  const { boardConfig, ships } = config;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const shipsById = useMemo(() => new Map(ships.map((s) => [s.id, s])), [ships]);

  // Bot placements (from state or generate once)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [botPlacements] = useState<PlacedShip[]>(() => {
    if (state!.botPlacements?.length) return state!.botPlacements!;
    const instances = buildShipInstances(ships);
    return buildRandomPlacements(instances, boardConfig, shipsById) ?? [];
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const botOccupied = useMemo(() => buildOccupiedMap(botPlacements, shipsById), [botPlacements, shipsById]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const playerOccupied = useMemo(() => buildOccupiedMap(playerPlacements, shipsById), [playerPlacements, shipsById]);

  // Game state
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [playerShots, setPlayerShots] = useState<Shot[]>([]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [botShots, setBotShots] = useState<Shot[]>([]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [turn, setTurn] = useState<TurnOwner>('player');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [phase, setPhase] = useState<GamePhase>('playing');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [result, setResult] = useState<GameResult | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [timer, setTimer] = useState(TURN_TIME);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [showStats, setShowStats] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [log, setLog] = useState<LogEntry[]>(() => [
    makeLog(t('gameBattle.logInit'), 'info'),
  ]);

  // Mutable refs so effects always read fresh values
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const playerShotsRef = useRef<Shot[]>([]);
  playerShotsRef.current = playerShots;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const botShotsRef = useRef<Shot[]>([]);
  botShotsRef.current = botShots;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const phaseRef = useRef<GamePhase>('playing');
  phaseRef.current = phase;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const autoFiredRef = useRef(false);

  // Log scroll
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const container = logContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [log]);

  const addLog = (message: string, highlight?: LogEntry['highlight']) => {
    setLog((prev) => [...prev, makeLog(message, highlight)]);
  };

  // Player fires at enemy board
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handlePlayerFire = useCallback(
    (x: number, y: number) => {
      if (phase !== 'playing' || turn !== 'player') return;
      if (playerShotsRef.current.some((s) => s.x === x && s.y === y)) return;

      const isHit = !!botOccupied.get(cellKey(x, y));
      const newShot: Shot = { x, y, isHit };
      const newPlayerShots = [...playerShotsRef.current, newShot];

      setPlayerShots(newPlayerShots);
      addLog(
        t(isHit ? 'gameBattle.logYouHit' : 'gameBattle.logYouMiss', {
          coord: toCoordLabel(x, y),
        }),
        isHit ? 'hit' : 'miss',
      );

      const allSunk = checkAllSunk(botPlacements, shipsById, newPlayerShots);
      if (allSunk) {
        setPhase('gameover');
        setResult('player_wins');
      } else {
        setTurn('bot');
      }
    },
    [phase, turn, botOccupied, botPlacements, shipsById, t],
  );

  // Reset timer & autoFired flag when it's player's turn
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (turn === 'player') {
      autoFiredRef.current = false;
      setTimer(TURN_TIME);
    }
  }, [turn]);

  // Countdown (only during human player's turn)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isBotVBot || phase !== 'playing' || turn !== 'player') return;
    const id = setInterval(() => {
      setTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [turn, phase, isBotVBot]);

  // Auto-fire when timer reaches 0
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (autoFiredRef.current) return;
    if (timer !== 0 || turn !== 'player' || phase !== 'playing' || isBotVBot) return;

    autoFiredRef.current = true;
    const target = botFireRandom(boardConfig, playerShotsRef.current);
    if (!target || phaseRef.current !== 'playing') return;

    const isHit = !!botOccupied.get(cellKey(target.x, target.y));
    const newShot: Shot = { ...target, isHit };
    const newPlayerShots = [...playerShotsRef.current, newShot];

    setPlayerShots(newPlayerShots);
    addLog(
      t(isHit ? 'gameBattle.logYouHit' : 'gameBattle.logYouMiss', {
        coord: toCoordLabel(target.x, target.y),
      }),
      isHit ? 'hit' : 'miss',
    );

    const allSunk = checkAllSunk(botPlacements, shipsById, newPlayerShots);
    if (allSunk) {
      setPhase('gameover');
      setResult('player_wins');
    } else {
      setTurn('bot');
    }
  }, [timer, turn, phase, isBotVBot]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bot fires at player board
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (phase !== 'playing' || turn !== 'bot') return;
    let cancelled = false;

    const delay = isBotVBot ? 700 : 1300;
    const id = setTimeout(() => {
      if (cancelled || phaseRef.current !== 'playing') return;

      const shots = botShotsRef.current;
      const target = getBotShot(boardConfig, ships, shots, isBotVBot ? 'random' : aiDifficulty);
      if (!target) return;

      const isHit = !!playerOccupied.get(cellKey(target.x, target.y));
      const newShot: Shot = { ...target, isHit };
      const newBotShots = [...shots, newShot];

      setBotShots(newBotShots);
      setLog((prev) => [
        ...prev,
        makeLog(
          t(isHit ? 'gameBattle.logEnemyHit' : 'gameBattle.logEnemyMiss', {
            coord: toCoordLabel(target.x, target.y),
          }),
          isHit ? 'hit' : 'miss',
        ),
      ]);

      const allSunk = checkAllSunk(playerPlacements, shipsById, newBotShots);
      if (allSunk) {
        setPhase('gameover');
        setResult('bot_wins');
      } else {
        setTurn('player');
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [turn, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // BotVBot: player-side bot fires
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!isBotVBot || phase !== 'playing' || turn !== 'player') return;
    let cancelled = false;

    const id = setTimeout(() => {
      if (cancelled || phaseRef.current !== 'playing') return;

      const shots = playerShotsRef.current;
      const target = botFireRandom(boardConfig, shots);
      if (!target) return;

      const isHit = !!botOccupied.get(cellKey(target.x, target.y));
      const newShot: Shot = { ...target, isHit };
      const newPlayerShots = [...shots, newShot];

      setPlayerShots(newPlayerShots);
      setLog((prev) => [
        ...prev,
        makeLog(
          t(isHit ? 'gameBattle.logBotAHit' : 'gameBattle.logBotAMiss', {
            coord: toCoordLabel(target.x, target.y),
          }),
          isHit ? 'hit' : 'miss',
        ),
      ]);

      const allSunk = checkAllSunk(botPlacements, shipsById, newPlayerShots);
      if (allSunk) {
        setPhase('gameover');
        setResult('player_wins');
      } else {
        setTurn('bot');
      }
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [turn, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const padTime = (n: number) => String(n).padStart(2, '0');
  const timerDisplay = `${padTime(Math.floor(timer / 60))}:${padTime(timer % 60)}`;

  const isBotThinking = turn === 'bot' && phase === 'playing';
  const isSettingsModalOpen = isModalOpen && modalMode === 'settings';
  const turnLabel = isBotVBot
    ? turn === 'player'
      ? t('gameBattle.botATurn')
      : t('gameBattle.botBTurn')
    : turn === 'player'
      ? t('gameBattle.yourTurn')
      : t('gameBattle.enemyTurn');

  // Keep gameplay music scoped to active matches only.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (phase === 'playing' && result === null) {
      void playBackgroundMusic();
      return;
    }

    if (phase === 'gameover') {
      fadeOutBackgroundMusic(500);
    }
  }, [fadeOutBackgroundMusic, phase, playBackgroundMusic, result]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(
    () => () => {
      stopBackgroundMusic();
    },
    [stopBackgroundMusic],
  );

  const handleQuit = () => {
    stopBackgroundMusic();
    navigate('/home');
  };
  const handlePlayAgain = () =>
    navigate('/game/setup', { state: { mode } });

  return (
    <motion.main
      className='relative h-dvh overflow-y-auto overflow-x-hidden px-2 py-2 text-(--text-main) sm:px-4 sm:py-4'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className='ui-page-bg -z-20' />
      <div className='absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(50,217,255,0.08),transparent_42%)]' />

      <section className='ui-hud-shell mx-auto flex min-h-full w-full max-w-7xl flex-col rounded-md p-2 sm:p-4'>
        {/* ── Row 1: HUD header ── */}
        <div className='grid grid-cols-2 items-start gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-3'>
          {/* Left: operation name */}
          <div className='order-1 min-w-0 sm:order-0 sm:justify-self-start'>
            <p className='ui-data-label'>{t('gameBattle.operationLabel')}</p>
            <p className='font-mono text-sm font-black uppercase tracking-[0.12em] text-(--accent-secondary) sm:text-base sm:tracking-widest'>
              {t('gameBattle.operation')}
            </p>
          </div>

          {/* Center: turn indicator */}
          <motion.div
            key={turn}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22 }}
            className={`order-3 col-span-2 mx-auto flex items-center gap-2 rounded-full border px-4 py-2 sm:order-0 sm:col-span-1 sm:justify-self-center sm:px-5 ${
              isBotThinking
                ? 'border-[rgba(255,140,50,0.6)] bg-[rgba(140,60,0,0.2)] text-[rgba(255,180,80,0.95)]'
                : 'border-[rgba(117,235,255,0.7)] bg-[rgba(34,211,238,0.12)] text-(--text-main)'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isBotThinking
                  ? 'bg-[rgba(255,180,80,0.9)] shadow-[0_0_6px_rgba(255,140,50,0.6)]'
                  : 'bg-[rgba(34,211,238,0.9)] shadow-[0_0_6px_rgba(34,211,238,0.6)]'
              }`}
            />
            <span className='font-mono text-sm font-black uppercase tracking-[0.16em]'>
              {turnLabel}
            </span>
          </motion.div>

          {/* Right: timer */}
          <div className='order-2 justify-self-end text-right sm:order-0 sm:justify-self-end'>
            <p className='ui-data-label'>{t('gameBattle.timer')}</p>
            <p
              className={`font-mono text-lg font-black tracking-[0.14em] sm:text-xl sm:tracking-widest ${
                timer <= 10 && !isBotThinking && !isBotVBot
                  ? 'text-[rgba(255,100,80,0.95)]'
                  : 'text-(--accent-secondary)'
              }`}
            >
              {isBotThinking || isBotVBot ? '--:--' : timerDisplay}
            </p>
          </div>
        </div>

        {/* ── Row 2: Battle boards ── */}
        <div className='mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-visible md:grid-cols-[1fr_auto_1fr] md:overflow-hidden'>
          {/* Player board */}
          <div className='flex min-h-0 flex-col gap-2'>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2'>
                <span className='text-xs text-(--accent-secondary)'>◈</span>
                <p className='ui-tactical-caption'>
                  {isBotVBot ? t('gameBattle.botAFleet') : t('gameBattle.myFleet')}
                </p>
              </div>
              {/* Fleet health strip */}
              <FleetHealthStrip
                placements={playerPlacements}
                shipsById={shipsById}
                damagingShots={botShots}
                cellSizePx={14}
              />
            </div>
            <div className='relative flex min-h-80 flex-col overflow-hidden rounded-md ui-panel ui-panel-strong p-2 sm:min-h-90 sm:p-3 md:min-h-0 md:flex-1'>
              <BattleBoard
                boardConfig={boardConfig}
                ships={ships}
                placements={playerPlacements}
                shots={botShots}
                revealShips
              />
              <AnimatePresence>
                {phase === 'gameover' && result && (
                  <GameOverOverlay
                    key='gameover'
                    result={result}
                    onPlayAgain={handlePlayAgain}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* VS divider */}
          <div className='hidden flex-col items-center justify-center gap-3 px-1 md:flex'>
            <div className='w-px h-full bg-linear-to-b from-transparent to-slate-800' />
            <p className='font-mono text-lg font-black tracking-[0.22em] text-(--text-subtle)'>VS</p>
            <div className='w-px h-full bg-linear-to-b from-slate-800 to-transparent' />
          </div>

          {/* Enemy board */}
          <div className='flex min-h-0 flex-col gap-2'>
            <div className='flex items-center gap-2'>
              <span className='text-xs text-(--accent-secondary)'>⊕</span>
              <p className='ui-tactical-caption'>
                {isBotVBot ? t('gameBattle.botBFleet') : t('gameBattle.enemyWaters')}
              </p>
            </div>
            <div className='relative flex min-h-80 flex-col overflow-hidden rounded-md ui-panel ui-panel-strong p-2 sm:min-h-90 sm:p-3 md:min-h-0 md:flex-1'>
              <BattleBoard
                boardConfig={boardConfig}
                ships={ships}
                placements={botPlacements}
                shots={playerShots}
                onFire={!isBotVBot ? handlePlayerFire : undefined}
                isActive={turn === 'player' && phase === 'playing' && !isBotVBot}
                revealShips={phase === 'gameover' || isBotVBot}
              />
              <AnimatePresence>
                {showStats && (
                  <StatsOverlay
                    key='stats'
                    playerShots={playerShots}
                    botShots={botShots}
                    isBotVBot={isBotVBot}
                    onClose={() => setShowStats(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Row 3: Mission log + footer ── */}
        <div className='mt-3 ui-panel rounded-md overflow-hidden'>
          <div className='px-3 pt-3 pb-2 sm:px-4'>
            <div className='flex items-center justify-between'>
              <p className='font-mono text-[10px] font-black uppercase tracking-[0.28em] text-(--accent-secondary)'>
                {t('gameBattle.missionLog')}
              </p>
              <p className='font-mono text-[9px] tracking-[0.16em] text-(--text-subtle)'>
                {t('gameBattle.systemVersion')}
              </p>
            </div>
            <div ref={logContainerRef} className='themed-scrollbar mt-2 h-11 overflow-y-auto pr-1 sm:h-32'>
              {log.map((entry, idx) => (
                <p key={`${entry.id}-${idx}`} className='font-mono text-[11px] leading-6'>
                  <span className='text-(--text-subtle)'>[{entry.timestamp}] </span>
                  <span
                    className={
                      entry.highlight === 'hit'
                        ? 'font-bold text-[rgba(255,110,90,0.95)]'
                        : entry.highlight === 'miss'
                          ? 'text-(--text-muted)'
                          : entry.highlight === 'info'
                            ? 'text-(--accent-secondary)'
                            : 'text-(--text-main)'
                    }
                  >
                    {entry.message}
                  </span>
                </p>
              ))}
            </div>
          </div>

          {/* Footer strip */}
          <div className='flex flex-col gap-2 border-t border-(--border-main) px-3 py-2 sm:px-4 md:flex-row md:items-center md:justify-between'>
            <div className='grid grid-cols-2 gap-2 md:flex'>
              <Button onClick={handleQuit} className='h-8 px-3 text-[10px] md:w-auto'>
                {t('gameBattle.quitMission')}
              </Button>
              <Button disabled className='h-8 px-3 text-[10px] opacity-40 md:w-auto'>
                {t('gameBattle.tacticalMap')}
              </Button>
              <Button
                onClick={() => setShowStats((v) => !v)}
                className={`col-span-2 h-8 px-3 text-[10px] md:col-span-1 md:w-auto ${
                  showStats ? 'border-[rgba(117,235,255,0.7)] text-(--accent-secondary)' : ''
                }`}
              >
                {t('gameBattle.statistics')}
              </Button>
            </div>
            <div className='flex items-center justify-end gap-2'>
              <p className='font-mono text-[9px] tracking-[0.14em] text-(--text-subtle) uppercase sm:tracking-[0.18em]'>
                {t('gameBattle.encryptedChannel')} 77.2
              </p>
              <button
                type='button'
                aria-label={t('settings.title')}
                title={t('settings.title')}
                onClick={() => openModal('settings')}
                className='cursor-pointer flex h-7 w-7 items-center justify-center rounded-sm border border-(--border-main) text-(--accent-secondary) transition-colors hover:bg-(--accent-soft) hover:text-(--text-main)'
              >
                <SlidersHorizontal size={14} />
              </button>
              <div className='h-3 w-6 rounded-full bg-[rgba(34,211,238,0.7)] shadow-[0_0_6px_rgba(34,211,238,0.4)]' />
            </div>
          </div>
        </div>
      </section>

      <SettingsModal isOpen={isSettingsModalOpen} onClose={closeModal} />
    </motion.main>
  );
}
