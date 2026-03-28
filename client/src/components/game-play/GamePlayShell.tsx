import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { getRankTierId } from '@/utils/rankTier';

type TurnTone = 'active' | 'alert';
type TurnTimerTone = 'default' | 'warning' | 'muted';

export type HeaderSideContent = {
  avatarSrc: string | null;
  label?: string;
  name: string;
  signature: string;
  align?: 'left' | 'right';
  /** Competitive ELO; when set, rank tier and ELO are shown under the signature. */
  elo?: number | null;
};

interface GamePlayShellProps {
  children: ReactNode;
  sectionClassName?: string;
}

interface GamePlayTurnStatusProps {
  turnKey: string | number;
  turnLabel: string;
  turnTone: TurnTone;
  turnTimerValue: string;
  turnTimerTone?: TurnTimerTone;
  className?: string;
}

interface GamePlayHeaderProps extends GamePlayTurnStatusProps {
  leftContent: HeaderSideContent;
  rightContent: HeaderSideContent;
}

function getTurnToneClasses(turnTone: TurnTone) {
  if (turnTone === 'alert') {
    return {
      container:
        'border-[rgba(255,140,50,0.6)] bg-[rgba(140,60,0,0.2)] text-[rgba(255,180,80,0.95)]',
      dot: 'bg-[rgba(255,180,80,0.9)] shadow-[0_0_6px_rgba(255,140,50,0.6)]',
    };
  }

  return {
    container:
      'border-[rgba(117,235,255,0.7)] bg-[rgba(34,211,238,0.12)] text-(--text-main)',
    dot: 'bg-[rgba(34,211,238,0.9)] shadow-[0_0_6px_rgba(34,211,238,0.6)]',
  };
}

function getTurnTimerClasses(turnTimerTone: TurnTimerTone) {
  if (turnTimerTone === 'warning') {
    return 'border-[rgba(255,140,50,0.48)] bg-[rgba(255,140,50,0.16)] text-[rgba(255,190,120,0.98)]';
  }

  if (turnTimerTone === 'muted') {
    return 'border-[rgba(117,235,255,0.18)] bg-[rgba(10,25,40,0.68)] text-(--text-muted)';
  }

  return 'border-[rgba(117,235,255,0.35)] bg-[rgba(34,211,238,0.12)] text-(--accent-secondary)';
}

export function GamePlayIdentityCard({
  content,
  onClick,
  buttonAriaLabel,
}: {
  content: HeaderSideContent;
  onClick?: () => void;
  buttonAriaLabel?: string;
}) {
  const { t } = useTranslation();
  const isRightAligned = content.align === 'right';
  const initials = content.name.trim().slice(0, 1).toUpperCase() || '?';
  const eloValue =
    typeof content.elo === 'number' && Number.isFinite(content.elo)
      ? content.elo
      : null;
  const rankTierId = eloValue !== null ? getRankTierId(eloValue) : null;
  const rankName =
    rankTierId !== null ? t(`rank.tiers.${rankTierId}.name`) : null;

  const cardBody = (
    <div
      className={`flex items-center gap-3 ${
        isRightAligned ? 'lg:flex-row-reverse' : ''
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--border-strong) bg-(--accent-soft) font-mono text-sm font-black text-(--accent-secondary) shadow-[0_0_18px_rgba(34,211,238,0.16)] sm:h-11 sm:w-11">
        {content.avatarSrc ? (
          <img
            src={content.avatarSrc}
            alt={content.name}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      <div className="min-w-0 flex-1">
        {content.label ? (
          <p className="ui-data-label">{content.label}</p>
        ) : null}
        <p className="truncate font-mono text-sm font-black tracking-[0.08em] text-(--text-main)">
          {content.name}
        </p>
        <p className="truncate text-xs text-(--text-muted)">
          {content.signature}
        </p>
        {eloValue !== null && rankName ? (
          <div
            className={`mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] leading-tight ${
              isRightAligned ? 'lg:justify-end' : ''
            }`}
          >
            <span className="font-mono tracking-[0.04em]">
              <span className="text-(--text-muted)">
                {t('home.profile.rank')}
                {': '}
              </span>
              <span className="text-(--text-main)">{rankName}</span>
            </span>
            <span className="font-mono tracking-[0.06em]">
              <span className="text-(--text-muted)">
                {t('home.profile.elo')}
                {': '}
              </span>
              <span className="font-bold text-(--accent-secondary)">
                {eloValue}
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={buttonAriaLabel ?? content.name}
        className={`ui-panel w-full cursor-pointer rounded-md px-2.5 py-1.5 text-left transition-colors hover:border-(--border-strong) hover:shadow-[0_0_18px_rgba(34,211,238,0.14)] focus-visible:outline-none focus-visible:border-(--ui-outline) focus-visible:shadow-[0_0_0_2px_var(--ui-focus-ring),0_0_18px_rgba(34,211,238,0.2)] sm:px-3 sm:py-2 ${
          isRightAligned ? 'lg:text-right' : ''
        }`}
      >
        {cardBody}
      </button>
    );
  }

  return (
    <div
      className={`ui-panel rounded-md px-2.5 py-1.5 sm:px-3 sm:py-2 ${
        isRightAligned ? 'lg:text-right' : ''
      }`}
    >
      {cardBody}
    </div>
  );
}

export function GamePlayTurnStatus({
  turnKey,
  turnLabel,
  turnTone,
  turnTimerValue,
  turnTimerTone = 'default',
  className = '',
}: GamePlayTurnStatusProps) {
  const toneClasses = getTurnToneClasses(turnTone);

  return (
    <motion.div
      key={turnKey}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22 }}
      className={`mx-auto flex w-full max-w-none items-center justify-center gap-2 rounded-full border px-4 py-1.5 sm:px-5 sm:py-2 md:max-w-[28rem] lg:w-auto lg:max-w-none lg:min-w-[15rem] ${toneClasses.container} ${className}`.trim()}
    >
      <span className={`h-2 w-2 rounded-full ${toneClasses.dot}`} />
      <div className="flex items-center gap-1 sm:gap-3">
        <span className="font-mono text-sm font-black uppercase tracking-[0.16em]">
          {turnLabel}
        </span>
        <span
          className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-black tracking-[0.18em] sm:py-1 ${getTurnTimerClasses(
            turnTimerTone,
          )}`}
        >
          {turnTimerValue}
        </span>
      </div>
    </motion.div>
  );
}

export function GamePlayShell({
  children,
  sectionClassName = 'ui-hud-shell mx-auto flex min-h-full w-full max-w-7xl flex-col rounded-md p-2 sm:p-4',
}: GamePlayShellProps) {
  return (
    <motion.main
      className="relative isolate h-dvh w-full min-w-0 max-w-none overflow-y-auto overflow-x-hidden px-2 py-2 text-(--text-main) sm:px-4 sm:py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Fixed to viewport so the scene background always spans the full screen width. */}
      <div
        className="pointer-events-none fixed inset-0 -z-20 h-[100dvh] w-full min-w-[100%]"
        aria-hidden
      >
        <div className="ui-page-bg absolute inset-0 h-full w-full" />
      </div>
      <div
        className="pointer-events-none fixed inset-0 -z-10 h-[100dvh] w-full min-w-[100%] bg-[radial-gradient(circle_at_top,rgba(50,217,255,0.08),transparent_42%)]"
        aria-hidden
      />
      <section className={sectionClassName}>{children}</section>
    </motion.main>
  );
}

export function GamePlayHeader({
  leftContent,
  rightContent,
  turnKey,
  turnLabel,
  turnTone,
  turnTimerValue,
  turnTimerTone = 'default',
}: GamePlayHeaderProps) {
  return (
    <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-3">
      <div className="order-2 min-w-0 lg:order-1">
        <GamePlayIdentityCard content={leftContent} />
      </div>

      <div className="order-1 flex w-full justify-center px-1 lg:order-2 lg:px-0">
        <GamePlayTurnStatus
          turnKey={turnKey}
          turnLabel={turnLabel}
          turnTone={turnTone}
          turnTimerValue={turnTimerValue}
          turnTimerTone={turnTimerTone}
        />
      </div>

      <div className="order-3 min-w-0">
        <GamePlayIdentityCard content={rightContent} />
      </div>
    </div>
  );
}
