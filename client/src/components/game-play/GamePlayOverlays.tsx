import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3,
  CircleOff,
  CircleX,
  Crosshair,
  Gauge,
  Minus,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import type { GameResult, Shot } from '@/types/game';
import { calculateShotStats } from '@/utils/gamePlayUtils';

export type BattleStatsNumbers = {
  shotsFired: number;
  hits: number;
  misses: number;
  accuracy: number;
};

interface GameOverOverlayProps {
  result: GameResult;
  onPlayAgain: () => void;
}

interface StatsOverlayProps {
  playerShots: Shot[];
  botShots: Shot[];
  isBotVBot: boolean;
  onClose: () => void;
  primaryFleetTitle?: string;
  secondaryFleetTitle?: string;
  allowMinimize?: boolean;
  minimized?: boolean;
  onMinimize?: () => void;
  onRestore?: () => void;
}

export function GameOverOverlay({
  result,
  onPlayAgain,
}: GameOverOverlayProps) {
  const { t } = useTranslation();
  const won = result === 'player_wins';
  const [minimized, setMinimized] = useState(false);

  if (minimized) {
    const minimizedTitle = won
      ? t('gameBattle.result.victory')
      : t('gameBattle.result.defeat');
    const ResultIcon = won ? Trophy : CircleX;

    return (
      <motion.button
        type='button'
        onClick={() => setMinimized(false)}
        aria-label={minimizedTitle}
        title={minimizedTitle}
        className={`cursor-pointer absolute bottom-3 left-3 z-50 flex h-10 w-10 items-center justify-center rounded-md border backdrop-blur-sm transition-colors ${
          won
            ? 'border-[rgba(117,235,255,0.7)] bg-[rgba(34,211,238,0.18)] text-(--accent-secondary) hover:bg-[rgba(34,211,238,0.28)]'
            : 'border-[rgba(220,60,60,0.6)] bg-[rgba(160,30,30,0.25)] text-[rgba(220,80,80,0.95)] hover:bg-[rgba(160,30,30,0.4)]'
        }`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.22 }}
      >
        <ResultIcon size={18} strokeWidth={2.2} />
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
      <div className='ui-gameplay-overlay-scrim absolute inset-0' />
      <motion.div
        className='mx-4 ui-gameplay-overlay-panel relative z-10 w-full rounded-md px-6 py-8 text-center'
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          type='button'
          onClick={() => setMinimized(true)}
          className='cursor-pointer absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-sm border border-[rgba(31,136,176,0.36)] text-(--text-muted) transition-colors hover:border-[rgba(117,235,255,0.5)] hover:text-(--text-main)'
          title={t('gameBattle.minimize')}
        >
          <Minus size={14} strokeWidth={2.2} />
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

interface StatRowProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'friendly' | 'hostile';
}

function getStatToneClasses(tone: NonNullable<StatRowProps['tone']>) {
  if (tone === 'hostile') {
    return {
      iconBadge:
        'border-[rgba(255,120,80,0.28)] bg-[rgba(255,120,80,0.08)] text-[rgba(255,145,110,0.96)]',
      value: 'text-[rgba(255,145,110,0.96)]',
      section: 'text-[rgba(255,145,110,0.88)]',
    };
  }

  return {
    iconBadge:
      'border-[rgba(31,136,176,0.26)] bg-[rgba(34,211,238,0.08)] text-(--accent-secondary)',
    value: 'text-(--accent-secondary)',
    section: 'text-(--text-subtle)',
  };
}

function StatRow({
  label,
  value,
  icon: Icon,
  tone = 'friendly',
}: StatRowProps) {
  const toneClasses = getStatToneClasses(tone);

  return (
    <div className='flex items-center justify-between gap-4 border-b border-[rgba(31,136,176,0.18)] py-1.5'>
      <span className='flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-(--text-muted)'>
        <span className={`flex h-5 w-5 items-center justify-center rounded-sm border ${toneClasses.iconBadge}`}>
          <Icon size={12} strokeWidth={2.2} />
        </span>
        {label}
      </span>
      <span className={`font-mono text-sm font-bold ${toneClasses.value}`}>
        {value}
      </span>
    </div>
  );
}

function statsFromNumbers(stats: BattleStatsNumbers) {
  return {
    total: stats.shotsFired,
    hits: stats.hits,
    misses: stats.misses,
    accuracy: stats.accuracy,
  };
}

export function BattleStatsBreakdown({
  primaryFleetTitle,
  secondaryFleetTitle,
  primary,
  secondary,
  headerRight,
}: {
  primaryFleetTitle: string;
  secondaryFleetTitle: string;
  primary: BattleStatsNumbers;
  secondary: BattleStatsNumbers;
  headerRight?: ReactNode;
}) {
  const { t } = useTranslation();
  const playerStats = statsFromNumbers(primary);
  const enemyStats = statsFromNumbers(secondary);

  return (
    <div className='ui-gameplay-overlay-panel relative z-10 h-full flex flex-col gap-3 overflow-y-auto rounded-md p-4'>
      <div className='flex items-center justify-between gap-2'>
        <p className='font-mono text-[11px] font-black uppercase tracking-[0.24em] text-(--accent-secondary)'>
          {t('gameBattle.stats.title')}
        </p>
        {headerRight}
      </div>
      <div>
        <p className='mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-(--text-subtle)'>
          {primaryFleetTitle}
        </p>
        <StatRow
          label={t('gameBattle.stats.shots')}
          value={playerStats.total}
          icon={Crosshair}
          tone='friendly'
        />
        <StatRow
          label={t('gameBattle.stats.hits')}
          value={playerStats.hits}
          icon={Target}
          tone='friendly'
        />
        <StatRow
          label={t('gameBattle.stats.misses')}
          value={playerStats.misses}
          icon={CircleOff}
          tone='friendly'
        />
        <StatRow
          label={t('gameBattle.stats.accuracy')}
          value={`${playerStats.accuracy}%`}
          icon={Gauge}
          tone='friendly'
        />
      </div>
      <div>
        <p
          className={`mb-1 font-mono text-[9px] uppercase tracking-[0.2em] ${getStatToneClasses('hostile').section}`}
        >
          {secondaryFleetTitle}
        </p>
        <StatRow
          label={t('gameBattle.stats.shots')}
          value={enemyStats.total}
          icon={Crosshair}
          tone='hostile'
        />
        <StatRow
          label={t('gameBattle.stats.hits')}
          value={enemyStats.hits}
          icon={Target}
          tone='hostile'
        />
        <StatRow
          label={t('gameBattle.stats.misses')}
          value={enemyStats.misses}
          icon={CircleOff}
          tone='hostile'
        />
        <StatRow
          label={t('gameBattle.stats.accuracy')}
          value={`${enemyStats.accuracy}%`}
          icon={Gauge}
          tone='hostile'
        />
      </div>
    </div>
  );
}

export function StatsOverlay({
  playerShots,
  botShots,
  isBotVBot,
  onClose,
  primaryFleetTitle,
  secondaryFleetTitle,
  allowMinimize = false,
  minimized = false,
  onMinimize,
  onRestore,
}: StatsOverlayProps) {
  const { t } = useTranslation();
  const playerStats = calculateShotStats(playerShots);
  const enemyStats = calculateShotStats(botShots);
  const primaryNumbers: BattleStatsNumbers = {
    shotsFired: playerStats.total,
    hits: playerStats.hits,
    misses: playerStats.misses,
    accuracy: playerStats.accuracy,
  };
  const secondaryNumbers: BattleStatsNumbers = {
    shotsFired: enemyStats.total,
    hits: enemyStats.hits,
    misses: enemyStats.misses,
    accuracy: enemyStats.accuracy,
  };

  if (allowMinimize && minimized) {
    const minimizedTitle = t('gameBattle.stats.title');

    return (
      <motion.button
        type='button'
        onClick={onRestore ?? onClose}
        aria-label={minimizedTitle}
        title={minimizedTitle}
        className='cursor-pointer absolute bottom-3 right-3 z-50 flex h-10 w-10 items-center justify-center rounded-md border border-[rgba(117,235,255,0.7)] bg-[rgba(34,211,238,0.18)] text-(--accent-secondary) backdrop-blur-sm transition-colors hover:bg-[rgba(34,211,238,0.28)]'
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.22 }}
      >
        <BarChart3 size={18} strokeWidth={2.2} />
      </motion.button>
    );
  }

  const headerButton = (
    <button
      type='button'
      onClick={allowMinimize ? (onMinimize ?? onClose) : onClose}
      className='cursor-pointer flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-[rgba(31,136,176,0.36)] text-(--text-muted) transition-colors hover:border-[rgba(255,100,80,0.5)] hover:text-[rgba(255,100,80,0.9)]'
      title={allowMinimize ? t('gameBattle.minimize') : undefined}
    >
      {allowMinimize ? (
        <Minus size={13} strokeWidth={2.2} />
      ) : (
        <CircleX size={13} strokeWidth={2.2} />
      )}
    </button>
  );

  return (
    <motion.div
      className='absolute inset-0 z-40 flex flex-col'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className='ui-gameplay-overlay-scrim absolute inset-0' />
      <div className='relative z-10 flex h-full flex-col'>
        <BattleStatsBreakdown
          primaryFleetTitle={
            primaryFleetTitle ??
            (isBotVBot
              ? t('gameBattle.botAFleet')
              : t('gameBattle.stats.youLabel'))
          }
          secondaryFleetTitle={
            secondaryFleetTitle ??
            (isBotVBot
              ? t('gameBattle.botBFleet')
              : t('gameBattle.stats.enemyLabel'))
          }
          primary={primaryNumbers}
          secondary={secondaryNumbers}
          headerRight={headerButton}
        />
      </div>
    </motion.div>
  );
}
