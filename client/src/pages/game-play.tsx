import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { images } from '@/assets';
import { ProfileShowcaseModal } from '@/components/modal/ProfileShowcaseModal';
import { SettingsModal } from '@/components/modal/SettingsModal';
import { BattleBoardPanel } from '@/components/game-play/GamePlayBattlefield';
import { HeatMapExplainWidget } from '@/components/game-play/HeatMapExplainWidget';
import {
  GameOverOverlay,
  StatsOverlay,
} from '@/components/game-play/GamePlayOverlays';
import { MissionLogPanel } from '@/components/game-play/MissionLogPanel';
import {
  GamePlayIdentityCard,
  GamePlayShell,
  GamePlayTurnStatus,
} from '@/components/game-play/GamePlayShell';
import { Button } from '@/components/ui/Button';
import { useGamePlayMusic } from '@/hooks/useGamePlayMusic';
import { useLocalGamePlaySession } from '@/hooks/useLocalGamePlaySession';
import { useOnlineGamePlaySession } from '@/hooks/useOnlineGamePlaySession';
import { usePlayerProfiles } from '@/hooks/usePlayerProfiles';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import {
  buildBotHeatMapExplanation,
  calculateFleetShipStatuses,
  type FleetShipStatus,
  type HeatMapExplanationEntry,
} from '@/utils/gamePlayUtils';
import type {
  AiDifficulty,
  BoardConfig,
  GameConfig,
  GameMode,
  GamePhase,
  GamePlayLocationState,
  GameResult,
  MissionLogEntry,
  PlacedShip,
  ShipDefinition,
  Shot,
} from '@/types/game';
import type { ChatMessage } from '@/types/chat';

const EMPTY_BOARD_CONFIG: BoardConfig = { rows: 0, cols: 0 };
const EMPTY_GAME_CONFIG: GameConfig = {
  boardConfig: EMPTY_BOARD_CONFIG,
  ships: [],
  turnTimerSeconds: 30,
};
const EMPTY_PLACEMENTS: PlacedShip[] = [];

export type GamePlayHeaderTone = 'active' | 'alert';

export interface GamePlayHeaderSideContent {
  avatarSrc: string | null;
  label?: string;
  name: string;
  signature: string;
  align?: 'left' | 'right';
  elo: number;
  userId?: string | null;
  pingMs?: number | null;
  adminActions?: Array<{
    key: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    tone?: 'default' | 'danger';
  }>;
}

export interface GamePlayLoadingFallback {
  label: string;
  title: string;
  description: string;
}

export interface GamePlayScreenModel {
  header: {
    leftContent: GamePlayHeaderSideContent;
    rightContent: GamePlayHeaderSideContent;
    turnKey: string | number;
    turnLabel: string;
    turnTone: GamePlayHeaderTone;
    turnTimerValue?: string;
  };
  battlefield: {
    boardConfig: BoardConfig;
    ships: ShipDefinition[];
    shipsById: Map<string, ShipDefinition>;
    ownPlacements: PlacedShip[];
    opponentPlacements: PlacedShip[];
    ownShots: Shot[];
    incomingShots: Shot[];
    ownTitle: string;
    opponentTitle: string;
    canFire: boolean;
    revealOwnShips?: boolean;
    revealOpponentShips: boolean;
    statsPrimaryTitle?: string;
    statsSecondaryTitle?: string;
    onFire?: (x: number, y: number) => void;
    isBotVBot: boolean;
    ownFleetStatus: FleetShipStatus[];
    opponentFleetStatus: FleetShipStatus[];
    ownBoardHeatMap?: Map<string, number>;
    opponentBoardHeatMap?: Map<string, number>;
    plannedOwnBoardShot?: { x: number; y: number } | null;
    plannedOpponentBoardShot?: { x: number; y: number } | null;
    heatMapSupported?: boolean;
    activeHeatExplanation?: {
      attackerLabel: string;
      targetLabel: string;
      difficulty: AiDifficulty;
      targetBoard: 'own' | 'opponent';
      entries: HeatMapExplanationEntry[];
    };
  };
  missionLog: {
    entries: MissionLogEntry[];
    heightClassName?: string;
    defaultTab?: 'logs' | 'chats';
    chatMessages?: ChatMessage[];
    currentUserId?: string | null;
    onSendChatMessage?: (content: string) => void;
    resolveChatAuthorLabel?: (senderId: string) => string;
  };
  actions: {
    onQuit: () => void;
    showEncryptedChannel: boolean;
    encryptedChannelValue?: string;
    encryptedChannelMaskable?: boolean;
    encryptedChannelMaskedValue?: string;
    isBotVBotPaused?: boolean;
    canApplyBotVBotStep?: boolean;
    onToggleBotVBotPause?: () => void;
    onStepBotVBotTurn?: () => void;
  };
  state: {
    phase: GamePhase;
    result: GameResult | null;
    onPlayAgain: () => void;
  };
}

function FleetStatusBar({
  label,
  ships,
}: {
  label: string;
  ships: FleetShipStatus[];
}) {
  const total = ships.length;
  const destroyed = ships.filter((ship) => ship.isDestroyed).length;
  const remaining = Math.max(0, total - destroyed);

  if (total === 0) {
    return (
      <p className='font-mono text-[9px] font-bold tracking-[0.14em] text-(--text-subtle)'>
        {label}
      </p>
    );
  }

  return (
    <div className='flex items-center gap-1.5'>
      <p className='font-mono text-[9px] font-bold tracking-[0.14em] text-(--text-subtle)'>
        {label}: {remaining}/{total}
      </p>
      <div className='flex flex-wrap items-center gap-1'>
        {ships.map((ship) => (
          <span
            key={ship.key}
            title={ship.label}
            className={`h-2 rounded-sm border ${
              ship.isDestroyed
                ? 'border-[rgba(255,110,100,0.65)] bg-[rgba(180,40,40,0.52)]'
                : 'border-[rgba(117,235,255,0.48)] bg-[rgba(34,211,238,0.26)]'
            }`}
            style={{ width: `${Math.max(10, ship.size * 8)}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function createHeaderContent({
  avatarSrc,
  label,
  name,
  fallbackName,
  signature,
  fallbackSignature = '- - -',
  align,
  elo,
  userId,
  pingMs,
}: {
  avatarSrc?: string | null;
  label?: string;
  name?: string | null;
  fallbackName: string;
  signature?: string | null;
  fallbackSignature?: string;
  align: 'left' | 'right';
  elo?: number;
  userId?: string | null;
  pingMs?: number | null;
}): GamePlayHeaderSideContent {
  return {
    avatarSrc: avatarSrc?.trim() || null,
    label,
    name: name?.trim() || fallbackName,
    signature: signature?.trim() || fallbackSignature,
    align,
    elo: typeof elo === 'number' && Number.isFinite(elo) ? elo : 0,
    userId: userId ?? null,
    pingMs:
      typeof pingMs === 'number' && Number.isFinite(pingMs)
        ? Math.max(0, Math.round(pingMs))
        : null,
  };
}

type StatsDisplayState = 'hidden' | 'minimized' | 'open';

export function GamePlayScreen({
  model = null,
  loadingFallback = null,
}: {
  model?: GamePlayScreenModel | null;
  loadingFallback?: GamePlayLoadingFallback | null;
}) {
  const { t } = useTranslation();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [statsDisplayState, setStatsDisplayState] = useState<StatsDisplayState>('hidden');
  const [chatDraft, setChatDraft] = useState('');
  const [chatJumpSignal, setChatJumpSignal] = useState(0);
  const [isHeatMapVisible, setIsHeatMapVisible] = useState(false);
  const [isHeatExplanationActive, setHeatExplanationActive] = useState(false);
  const [showcaseSide, setShowcaseSide] = useState<'left' | 'right' | null>(null);
  const [isEncryptedChannelMasked, setEncryptedChannelMasked] = useState(() =>
    Boolean(model?.actions.encryptedChannelMaskable),
  );

  const phase = model?.state.phase ?? 'playing';
  const result = model?.state.result ?? null;
  const { stopBackgroundMusic } = useGamePlayMusic({ phase, result });

  const handleToggleStats = () => {
    if (!model) {
      return;
    }

    if (model.state.phase === 'gameover') {
      setStatsDisplayState((current) =>
        current === 'minimized' ? 'open' : 'minimized',
      );
      return;
    }

    setStatsDisplayState((current) => (current === 'open' ? 'hidden' : 'open'));
  };

  // Skeleton
  if (!model) {
    return (
      <GamePlayShell sectionClassName='ui-hud-shell mx-auto flex h-full w-full max-w-3xl items-center justify-center rounded-md p-4'>
        <div className='ui-panel ui-panel-strong w-full max-w-xl rounded-md p-6 text-center'>
          <p className='ui-data-label'>
            {loadingFallback?.label ?? 'GAMEPLAY'}
          </p>
          <h1 className='mt-2 font-mono text-xl font-black uppercase tracking-[0.18em] text-(--accent-secondary)'>
            {loadingFallback?.title ?? 'Syncing match state'}
          </h1>
          <p className='mt-4 text-sm leading-7 text-(--text-muted)'>
            {loadingFallback?.description ??
              'Waiting for the latest game state snapshot.'}
          </p>
        </div>
      </GamePlayShell>
    );
  }

  const { header, battlefield, missionLog, actions, state } = model;
  const showcaseContent = showcaseSide === 'left' ? header.leftContent : showcaseSide === 'right' ? header.rightContent : null;
  const showcaseProfile = showcaseContent?.userId
    ? {
      id: showcaseContent.userId,
      username: showcaseContent.name,
      avatar: showcaseContent.avatarSrc,
      signature: showcaseContent.signature,
      label: showcaseContent.label,
      elo: showcaseContent.elo,
    }
    : null;
  const isStatsVisible =
    state.phase === 'gameover' || statsDisplayState === 'open';
  const isStatsMinimized =
    state.phase === 'gameover' && statsDisplayState === 'minimized';
  const isSettingsExpanded = isStatsVisible && !isStatsMinimized;
  const encryptedChannelValue = actions.encryptedChannelValue ?? '77.2';
  const encryptedChannelDisplay =
    actions.encryptedChannelMaskable && isEncryptedChannelMasked
      ? (actions.encryptedChannelMaskedValue ?? '***')
      : encryptedChannelValue;
  const canSendChat = typeof missionLog.onSendChatMessage === 'function';
  const activeTargetBoard = battlefield.activeHeatExplanation?.targetBoard;
  const ownBoardFocused = isHeatExplanationActive && activeTargetBoard === 'own';
  const opponentBoardFocused = isHeatExplanationActive && activeTargetBoard === 'opponent';

  const handleQuit = () => {
    stopBackgroundMusic();
    actions.onQuit();
  };

  const handleSendChat = () => {
    const content = chatDraft.trim();
    if (!content || !missionLog.onSendChatMessage) {
      return;
    }

    missionLog.onSendChatMessage(content);
    setChatDraft('');
    setChatJumpSignal((current) => current + 1);
  };

  return (
    <GamePlayShell>
      <div className='flex h-[calc(100dvh-2rem)] min-h-[calc(100dvh-2rem)] flex-col gap-1.5 sm:h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-4rem)] sm:gap-2 md:h-auto md:min-h-0 md:flex-1 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:grid-rows-[auto_minmax(0,1fr)] md:gap-3'>
        {/* Left header based on 2 device type */}
        <div className='order-1 shrink-0 md:hidden'>
          <GamePlayIdentityCard
            content={header.leftContent}
            showSignature={false}
            onClick={header.leftContent.userId ? () => setShowcaseSide('left') : undefined}
          />
        </div>
        <div className='hidden md:col-start-1 md:row-start-1 md:block lg:w-100 md:justify-self-start'>
          <GamePlayIdentityCard
            content={header.leftContent}
            showSignature={false}
            onClick={header.leftContent.userId ? () => setShowcaseSide('left') : undefined}
          />
        </div>

        {/* Turn status on desktop device */}
        <div className='hidden md:col-start-1 md:col-end-4 md:row-start-1 md:block md:pointer-events-none'>
          <div className='relative h-full min-h-19'>
            <div className='absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-4'>
              <GamePlayTurnStatus
                turnKey={header.turnKey}
                turnLabel={header.turnLabel}
                turnTone={header.turnTone}
                turnTimerValue={header.turnTimerValue}
                className='pointer-events-auto md:w-auto md:min-w-60 md:max-w-[18rem]'
              />
            </div>
          </div>
        </div>

        {/* Commander panel */}
        <div className='order-2 min-h-0 basis-0 flex-1 md:col-start-1 md:row-start-2'>
          <div className='h-full min-h-0'>
            <BattleBoardPanel
              tone='friendly'
              title={battlefield.ownTitle}
              headerAside={
                <FleetStatusBar
                  label={t('gameBattle.myFleet')}
                  ships={battlefield.ownFleetStatus}
                />
              }
              rootClassName={`h-full gap-1.5 sm:gap-2 transition-all duration-200 ${
                isHeatExplanationActive
                  ? ownBoardFocused
                    ? ''
                    : 'opacity-40 grayscale-[0.55]'
                  : ''
              }`}
              panelClassName='p-1.5 sm:p-3'
              boardProps={{
                boardConfig: battlefield.boardConfig,
                ships: battlefield.ships,
                placements: battlefield.ownPlacements,
                shots: battlefield.incomingShots,
                revealShips: battlefield.revealOwnShips ?? true,
                heatMap:
                  battlefield.isBotVBot && isHeatMapVisible
                    ? battlefield.ownBoardHeatMap
                    : undefined,
                plannedShot: battlefield.isBotVBot
                  ? battlefield.plannedOwnBoardShot
                  : undefined,
                heatEmphasis:
                  battlefield.isBotVBot && header.turnKey === 'bot'
                    ? 'strong'
                    : 'normal',
              }}
              overlay={
                <AnimatePresence>
                  {state.phase === 'gameover' && state.result ? (
                    <GameOverOverlay
                      result={state.result}
                      onPlayAgain={state.onPlayAgain}
                    />
                  ) : null}
                </AnimatePresence>
              }
            />
          </div>
        </div>

        {/* Turn status on mobile device */}
        <div className='order-3 shrink-0 px-0.5 sm:px-1 md:hidden'>
          <GamePlayTurnStatus
            turnKey={header.turnKey}
            turnLabel={header.turnLabel}
            turnTone={header.turnTone}
            turnTimerValue={header.turnTimerValue}
          />
        </div>

        {/* Opponent panel */}
        <div className='order-4 min-h-0 basis-0 flex-1 md:col-start-3 md:row-start-2'>
          <div className='h-full min-h-0'>
            <BattleBoardPanel
              tone='hostile'
              title={battlefield.opponentTitle}
              headerAside={
                <FleetStatusBar
                  label={t('gameBattle.enemyWaters')}
                  ships={battlefield.opponentFleetStatus}
                />
              }
              rootClassName={`h-full gap-1.5 sm:gap-2 transition-all duration-200 ${
                isHeatExplanationActive
                  ? opponentBoardFocused
                    ? ''
                    : 'opacity-40 grayscale-[0.55]'
                  : ''
              }`}
              panelClassName='p-1.5 sm:p-3'
              mobileHeaderPosition='bottom'
              desktopHeaderAlign='right'
              boardProps={{
                boardConfig: battlefield.boardConfig,
                ships: battlefield.ships,
                placements: battlefield.opponentPlacements,
                shots: battlefield.ownShots,
                onFire: battlefield.onFire,
                isActive: battlefield.canFire,
                revealShips: battlefield.revealOpponentShips,
                heatMap:
                  battlefield.isBotVBot && isHeatMapVisible
                    ? battlefield.opponentBoardHeatMap
                    : undefined,
                plannedShot: battlefield.isBotVBot
                  ? battlefield.plannedOpponentBoardShot
                  : undefined,
                heatEmphasis:
                  battlefield.isBotVBot && header.turnKey === 'player'
                    ? 'strong'
                    : 'normal',
              }}
              overlay={
                <AnimatePresence>
                  {isStatsVisible ? (
                    <StatsOverlay
                      playerShots={battlefield.ownShots}
                      botShots={battlefield.incomingShots}
                      isBotVBot={battlefield.isBotVBot}
                      onClose={() => setStatsDisplayState('hidden')}
                      primaryFleetTitle={battlefield.statsPrimaryTitle}
                      secondaryFleetTitle={battlefield.statsSecondaryTitle}
                      allowMinimize={state.phase === 'gameover'}
                      minimized={isStatsMinimized}
                      onMinimize={() => setStatsDisplayState('minimized')}
                      onRestore={() => setStatsDisplayState('open')}
                    />
                  ) : null}
                </AnimatePresence>
              }
            />
          </div>
        </div>

        {/* Right header based on 2 device type */}
        <div className='hidden md:col-start-3 md:row-start-1 md:block lg:w-100 md:justify-self-end'>
          <GamePlayIdentityCard
            content={header.rightContent}
            showSignature={false}
            onClick={header.rightContent.userId ? () => setShowcaseSide('right') : undefined}
          />
        </div>
        <div className='order-5 shrink-0 md:hidden'>
          <GamePlayIdentityCard
            content={header.rightContent}
            showSignature={false}
            onClick={header.rightContent.userId ? () => setShowcaseSide('right') : undefined}
          />
        </div>

        {/* VS divider, disabled on mobile */}
        <div className='hidden md:flex md:col-start-2 md:row-start-2 md:flex-col md:items-center md:justify-center md:gap-3 md:px-10'>
          <div
            className='h-full w-px opacity-70'
            style={{
              background:
                'linear-gradient(to bottom, transparent, var(--border-main))',
            }}
          />
          <p className='font-mono text-lg font-black tracking-[0.22em] text-(--text-subtle)'>
            VS
          </p>
          <div
            className='h-full w-px opacity-70'
            style={{
              background:
                'linear-gradient(to bottom, var(--border-main), transparent)',
            }}
          />
        </div>
      </div>

      <div className='mt-2 ui-panel overflow-hidden rounded-md'>
        <MissionLogPanel
          title={t('gameBattle.missionLog')}
          entries={missionLog.entries}
          chatMessages={missionLog.chatMessages}
          currentUserId={missionLog.currentUserId}
          onSendMessage={missionLog.onSendChatMessage}
          resolveChatAuthorLabel={missionLog.resolveChatAuthorLabel}
          jumpToChatSignal={chatJumpSignal}
          defaultTab={missionLog.defaultTab}
          mode={battlefield.isBotVBot || !missionLog.onSendChatMessage ? 'logs-only' : 'tabs'}
        />

        {/* Bottom panel */}
        <div className='border-t border-(--border-main) flex w-full min-w-0 flex-col gap-2 px-3 py-2 sm:px-4 md:flex-row md:items-center md:justify-between'>
          <div className='flex w-full min-w-0 flex-wrap items-center gap-2 md:flex-nowrap md:min-w-0 md:flex-1'>
            {/* Chat input */}
            {canSendChat ? (
              <div className='flex w-full min-w-0 flex-col gap-2 sm:flex-row lg:w-[50%] lg:max-w-md'>
                <input
                  type='text'
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSendChat();
                    }
                  }}
                  placeholder={t('gameBattle.chatInputPlaceholder')}
                  maxLength={280}
                  className='ui-input min-w-0 flex-1 basis-0 rounded-sm px-3 py-2 font-mono text-[11px] outline-none transition-colors placeholder:text-(--text-muted)'
                />
                <button
                  type='button'
                  onClick={handleSendChat}
                  disabled={chatDraft.trim().length === 0}
                  className='shrink-0 cursor-pointer self-center rounded-sm border border-[rgba(117,235,255,0.68)] bg-[rgba(117,235,255,0.12)] px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-(--accent-secondary) transition-colors hover:bg-[rgba(117,235,255,0.18)] disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {t('gameBattle.chatSend')}
                </button>
              </div>
            ) : null}

            {battlefield.isBotVBot && state.phase === 'playing' ? (
              <>
                <Button
                  onClick={actions.onToggleBotVBotPause}
                  className='h-8 px-3 text-[10px] md:w-auto'
                >
                  {actions.isBotVBotPaused
                    ? t('gameBattle.resumeFlow')
                    : t('gameBattle.pauseFlow')}
                </Button>
                {battlefield.heatMapSupported ? (
                  <Button
                    onClick={() => setIsHeatMapVisible((current) => !current)}
                    disabled={!battlefield.heatMapSupported}
                    className={`h-8 px-3 text-[10px] md:w-auto ${
                      isHeatMapVisible && battlefield.heatMapSupported
                        ? 'border-[rgba(117,235,255,0.7)] text-(--accent-secondary)'
                        : ''
                    }`}
                  >
                    {t('gameBattle.heatMap')}
                  </Button>
                ) : null}
                {actions.isBotVBotPaused ? (
                  <Button
                    onClick={actions.onStepBotVBotTurn}
                    disabled={!actions.canApplyBotVBotStep}
                    className='h-8 px-3 text-[10px] md:w-auto'
                  >
                    {t('gameBattle.nextShot')}
                  </Button>
                ) : null}
                {battlefield.heatMapSupported ? (
                  <HeatMapExplainWidget
                    explanation={battlefield.activeHeatExplanation}
                    boardConfig={battlefield.boardConfig}
                    onOpenChange={setHeatExplanationActive}
                    dimOthers={isHeatExplanationActive}
                  />
                ) : null}
              </>
            ) : null}

            {/* Stats btn */}
            <Button
              onClick={handleToggleStats}
              className={`h-8 px-3 text-[10px] md:w-auto ${
                isSettingsExpanded
                  ? 'border-[rgba(117,235,255,0.7)] text-(--accent-secondary)'
                  : ''
              }`}
            >
              {t('gameBattle.statistics')}
            </Button>
            {/* Quit btn */}
            <Button
              onClick={handleQuit}
              variant='danger'
              className='h-8 px-3 text-[10px] md:w-auto'
            >
              {t('gameBattle.quitMission')}
            </Button>
          </div>

          <div className='flex items-center justify-end gap-2'>
            {/* Encrypt room code if online */}
            {actions.showEncryptedChannel ? (
              <div className='flex items-center gap-1.5'>
                <p className='font-mono text-[9px] uppercase tracking-[0.14em] text-(--text-subtle) sm:tracking-[0.18em]'>
                  {t('gameBattle.encryptedChannel')} {encryptedChannelDisplay}
                </p>
                {actions.encryptedChannelMaskable ? (
                  <button
                    type='button'
                    onClick={() =>
                      setEncryptedChannelMasked((current) => !current)
                    }
                    className='cursor-pointer flex h-6 w-6 items-center justify-center rounded-sm border border-(--border-main) text-(--text-subtle) transition-colors hover:bg-(--accent-soft) hover:text-(--text-main)'
                  >
                    {isEncryptedChannelMasked ? (
                      <Eye size={12} />
                    ) : (
                      <EyeOff size={12} />
                    )}
                  </button>
                ) : null}
              </div>
            ) : null}
            {/* Settings btn */}
            <button
              type='button'
              aria-label={t('settings.title')}
              title={t('settings.title')}
              onClick={() => setIsSettingsModalOpen(true)}
              className='cursor-pointer flex h-7 w-7 items-center justify-center rounded-sm border border-(--border-main) text-(--accent-secondary) transition-colors hover:bg-(--accent-soft) hover:text-(--text-main)'
            >
              <SlidersHorizontal size={14} />
            </button>
            <div className='h-3 w-6 rounded-full bg-[rgba(34,211,238,0.7)] shadow-[0_0_6px_rgba(34,211,238,0.4)]' />
          </div>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      <ProfileShowcaseModal
        isOpen={showcaseSide !== null}
        onClose={() => setShowcaseSide(null)}
        profile={showcaseProfile}
      />
    </GamePlayShell>
  );
}

type ValidLocalGamePlayState = GamePlayLocationState & {
  config: GameConfig;
  placements: PlacedShip[];
  mode?: Exclude<GameMode, 'online'>;
};

function isValidLocalGamePlayState(
  state: GamePlayLocationState | null,
): state is ValidLocalGamePlayState {
  return !!state?.config && Array.isArray(state.placements);
}

function padTime(value: number) {
  return String(value).padStart(2, '0');
}

type ValidOnlineGamePlayState = GamePlayLocationState & {
  roomId: string;
  matchId: string;
};

function hasOnlineMatchState(
  state: GamePlayLocationState | null,
): state is ValidOnlineGamePlayState {
  return (
    typeof state?.roomId === 'string' && typeof state?.matchId === 'string'
  );
}

// Page included all logics for game panel
export function GamePlayPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const state = location.state as GamePlayLocationState | null;
  const isOnlineMode = state?.mode === 'online';
  const localState = isValidLocalGamePlayState(state) ? state : null;
  const onlineState = hasOnlineMatchState(state) ? state : null;
  const localMode = localState?.mode === 'botvbot' ? 'botvbot' : 'bot';
  const localAiDifficulty = localState?.aiDifficulty ?? 'random';
  const localBotVBotSettings = localState?.botVBotSettings;

  const {
    boardConfig,
    ships,
    shipsById,
    playerPlacements,
    botPlacements,
    playerShots,
    botShots,
    turn,
    phase: localPhase,
    result: localResult,
    timer,
    turnLabel,
    isBotVBot,
    isBotThinking,
    canPlayerFire,
    logEntries,
    handlePlayerFire,
    ownBoardHeatMap,
    opponentBoardHeatMap,
    isBotVBotPaused,
    toggleBotVBotPause,
    stepBotVBotTurn,
    plannedOwnBoardShot,
    plannedOpponentBoardShot,
  } = useLocalGamePlaySession({
    mode: localMode,
    config: localState?.config ?? EMPTY_GAME_CONFIG,
    playerPlacements: localState?.placements ?? EMPTY_PLACEMENTS,
    initialBotPlacements: localState?.botPlacements,
    aiDifficulty: localState?.aiDifficulty ?? 'random',
    botVBotSettings: localState?.botVBotSettings,
    t,
    enabled: !isOnlineMode && !!localState,
  });
  const {
    room,
    match,
    latencyMs,
    chat,
    model: onlineModel,
    phase: onlinePhase,
    result: onlineResult,
    currentUserId,
    loadingFallback,
    leaveRoom: leaveOnlineRoom,
  } = useOnlineGamePlaySession({
    roomId: onlineState?.roomId ?? '',
    matchId: onlineState?.matchId ?? '',
    fallbackConfig: onlineState?.config,
    fallbackPlacements: onlineState?.placements,
    enabled: isOnlineMode && !!onlineState,
  });
  const { user } = useGlobalContext();
  const onlineOpponentId =
    currentUserId === match?.player1Id
      ? match.player2Id
      : currentUserId === match?.player2Id
        ? match.player1Id
        : null;
  const { getProfileById } = usePlayerProfiles([
    currentUserId,
    onlineOpponentId,
  ]);
  const currentPlayerProfile = getProfileById(currentUserId);
  const opponentProfile = getProfileById(onlineOpponentId);
  const resolveOnlineChatAuthorLabel = useCallback(
    (senderId: string) => {
      if (senderId === currentUserId) {
        return (
          currentPlayerProfile?.username?.trim() ||
          t('gameBattle.chatYouLabel')
        );
      }

      if (senderId === onlineOpponentId) {
        return (
          opponentProfile?.username?.trim() || t('gameBattle.chatOpponentLabel')
        );
      }

      return t('gameBattle.chatOpponentLabel');
    },
    [
      currentPlayerProfile?.username,
      currentUserId,
      onlineOpponentId,
      opponentProfile?.username,
      t,
    ],
  );
  const activeHeatExplanation = useMemo(() => {
    if (!localState || !isBotVBot) {
      return undefined;
    }

    const isBotBTurn = turn === 'bot';
    const difficulty = isBotBTurn
      ? (localBotVBotSettings?.botB.difficulty ?? 'random')
      : (localBotVBotSettings?.botA.difficulty ?? 'random');

    return {
      attackerLabel: isBotBTurn ? 'BOT B' : 'BOT A',
      targetLabel: isBotBTurn
        ? t('gameBattle.botAFleet')
        : t('gameBattle.botBFleet'),
      difficulty,
      targetBoard: isBotBTurn ? ('own' as const) : ('opponent' as const),
      entries: buildBotHeatMapExplanation(
        boardConfig,
        ships,
        isBotBTurn ? botShots : playerShots,
        difficulty,
        isBotBTurn ? playerPlacements : botPlacements,
        shipsById,
      ),
    };
  }, [
    boardConfig,
    botPlacements,
    botShots,
    isBotVBot,
    localBotVBotSettings,
    localState,
    playerPlacements,
    playerShots,
    ships,
    shipsById,
    t,
    turn,
  ]);
  const currentElo = currentPlayerProfile?.elo ?? 0;
  const opponentElo = opponentProfile?.elo ?? 0;
  const onlineLeftHeaderContent = createHeaderContent({
    avatarSrc: currentPlayerProfile?.avatar,
    label: 'COMMANDER',
    name: currentPlayerProfile?.username,
    fallbackName: 'Commander',
    signature: currentPlayerProfile?.signature,
    align: 'left',
    elo: currentElo,
    userId: currentUserId,
    pingMs: latencyMs,
  });
  const onlineRightHeaderContent = createHeaderContent({
    avatarSrc: opponentProfile?.avatar,
    label: 'OPPONENT',
    name: opponentProfile?.username,
    fallbackName: onlineOpponentId
      ? `#${onlineOpponentId.slice(0, 8)}`
      : 'Opponent',
    signature: opponentProfile?.signature,
    align: 'right',
    elo: opponentElo,
    userId: onlineOpponentId,
    pingMs: latencyMs,
  });

  useEffect(() => {
    if (isOnlineMode) {
      if (!onlineState) {
        navigate('/game/rooms', { replace: true });
      }
      return;
    }

    if (!localState) {
      navigate(localMode === 'botvbot' ? '/game/bot-setup' : '/game/setup', {
        replace: true,
      });
    }
  }, [isOnlineMode, localMode, localState, navigate, onlineState]);

  useEffect(() => {
    if (!isOnlineMode || !onlineState || !room) {
      return;
    }

    if (room.status === 'closed') {
      const closeReasonCode = room.closeReasonCode ?? 'host_closed';
      const closeReasonMessage = room.closeReasonMessage ?? undefined;
      const wasSelfBanned =
        closeReasonCode === 'admin_ban' &&
        !!room.closeReasonTargetUserId &&
        user?.id === room.closeReasonTargetUserId;
      leaveOnlineRoom();
      if (closeReasonCode === 'admin_ban') {
        navigate('/game/rooms', {
          replace: true,
          state: {
            roomDismissed: wasSelfBanned ? 'banned' : 'banned_other',
            roomDismissedMessage:
              closeReasonMessage ??
              (wasSelfBanned
                ? t('gameRooms.banAcknowledgeDefaultMessage')
                : t('gameRooms.roomOtherPlayerBannedByAdmin')),
            requireBanAcknowledge: wasSelfBanned,
          },
        });
        return;
      }
      navigate('/game/rooms', {
        replace: true,
        state: {
          roomDismissed:
            closeReasonCode === 'admin_force_result'
              ? 'forced_result'
              : closeReasonCode === 'admin_kick'
                ? 'kicked'
                : closeReasonCode === 'admin_ban'
                  ? 'banned'
                  : match?.status === 'finished'
                    ? 'forced_result'
                    : 'host_closed',
          roomDismissedMessage: closeReasonMessage,
        },
      });
      return;
    }

    if (room.status === 'setup') {
      navigate('/game/setup', {
        replace: true,
        state: {
          mode: 'online',
          roomId: onlineState.roomId,
          matchId: match?.id ?? onlineState.matchId,
        },
      });
      return;
    }

    if (room.status === 'waiting') {
      navigate('/game/waiting', {
        replace: true,
        state: { roomId: onlineState.roomId },
      });
    }
  }, [
    isOnlineMode,
    leaveOnlineRoom,
    match?.id,
    match?.status,
    navigate,
    onlineState,
    room,
    t,
    user?.id,
    room?.closeReasonTargetUserId,
  ]);

  const ownFleetStatus = useMemo(
    () => calculateFleetShipStatuses(playerPlacements, shipsById, botShots),
    [botShots, playerPlacements, shipsById],
  );
  const opponentFleetStatus = useMemo(
    () => calculateFleetShipStatuses(botPlacements, shipsById, playerShots),
    [botPlacements, playerShots, shipsById],
  );

  if (isOnlineMode) {
    if (!onlineState) {
      return null;
    }

    if (!onlineModel) {
      return <GamePlayScreen loadingFallback={loadingFallback} />;
    }

    return (
      <GamePlayScreen
        key={`online:${room?.roomCode ?? onlineState.roomId}`}
        model={{
          ...onlineModel,
          header: {
            ...onlineModel.header,
            leftContent: onlineLeftHeaderContent,
            rightContent: onlineRightHeaderContent,
          },
          missionLog: {
            ...onlineModel.missionLog,
            chatMessages: chat.messages,
            currentUserId,
            onSendChatMessage: room && match ? chat.sendMessage : undefined,
            resolveChatAuthorLabel: resolveOnlineChatAuthorLabel,
          },
          actions: {
            onQuit: () => {
              leaveOnlineRoom();
              navigate('/game/rooms');
            },
            showEncryptedChannel: true,
            encryptedChannelValue: room?.roomCode ?? '-----',
            encryptedChannelMaskable: true,
            encryptedChannelMaskedValue: '***',
          },
          state: {
            phase: onlinePhase,
            result: onlineResult,
            onPlayAgain: () => navigate('/game/rooms'),
          },
        }}
      />
    );
  }

  if (!localState) {
    return null;
  }

  const timerDisplay = `${padTime(Math.floor(timer / 60))}:${padTime(timer % 60)}`;
  const leftHeaderContent =
    localMode === 'botvbot'
      ? createHeaderContent({
        avatarSrc: images.botAvatar,
        label: 'BOT',
        name: 'BOT A',
        fallbackName: 'BOT A',
        signature: localBotVBotSettings?.botA.difficulty
          ? t(
            `gameSetup.aiDifficulty.${localBotVBotSettings.botA.difficulty}`,
          )
          : 'RANDOM',
        fallbackSignature: 'RANDOM',
        align: 'left',
      })
      : createHeaderContent({
        avatarSrc: currentPlayerProfile?.avatar,
        label: 'COMMANDER',
        name: currentPlayerProfile?.username,
        fallbackName: 'Alpha',
        signature: currentPlayerProfile?.signature,
        align: 'left',
        elo: currentPlayerProfile?.elo,
        userId: currentUserId,
      });
  const rightHeaderContent =
    localMode === 'botvbot'
      ? createHeaderContent({
        avatarSrc: images.botAvatar,
        label: 'BOT',
        name: 'BOT B',
        fallbackName: 'BOT B',
        signature: localBotVBotSettings?.botB.difficulty
          ? t(
            `gameSetup.aiDifficulty.${localBotVBotSettings.botB.difficulty}`,
          )
          : 'RANDOM',
        fallbackSignature: 'RANDOM',
        align: 'right',
      })
      : createHeaderContent({
        avatarSrc: images.botAvatar,
        label: 'BOT',
        name: 'AI OPPONENT',
        fallbackName: 'AI OPPONENT',
        signature: t(`gameSetup.aiDifficulty.${localAiDifficulty}`),
        align: 'right',
      });

  const localHeader: GamePlayScreenModel['header'] = {
    leftContent: leftHeaderContent,
    rightContent: rightHeaderContent,
    turnKey: turn,
    turnLabel,
    turnTone: isBotThinking ? 'alert' : 'active',
    turnTimerValue: isBotVBot || isBotThinking ? undefined : timerDisplay,
  };

  const localBattlefield: GamePlayScreenModel['battlefield'] = {
    boardConfig,
    ships,
    shipsById,
    ownPlacements: playerPlacements,
    opponentPlacements: botPlacements,
    ownShots: playerShots,
    incomingShots: botShots,
    ownFleetStatus,
    opponentFleetStatus,
    ownTitle: isBotVBot ? t('gameBattle.botAFleet') : t('gameBattle.myFleet'),
    opponentTitle: isBotVBot ? t('gameBattle.botBFleet') : t('gameBattle.enemyWaters'),
    canFire: canPlayerFire,
    revealOpponentShips: localPhase === 'gameover' || isBotVBot,
    onFire: isBotVBot ? undefined : handlePlayerFire,
    isBotVBot,
    ownBoardHeatMap: isBotVBot ? ownBoardHeatMap : undefined,
    opponentBoardHeatMap: isBotVBot ? opponentBoardHeatMap : undefined,
    plannedOwnBoardShot: isBotVBot ? plannedOwnBoardShot : undefined,
    plannedOpponentBoardShot: isBotVBot ? plannedOpponentBoardShot : undefined,
    heatMapSupported: isBotVBot
      ? localBotVBotSettings?.botA.difficulty === 'probability' ||
        localBotVBotSettings?.botB.difficulty === 'probability'
      : undefined,
    activeHeatExplanation,
  };

  const localActions: GamePlayScreenModel['actions'] = {
    onQuit: () => navigate('/home'),
    showEncryptedChannel: true,
    encryptedChannelValue: '77.2',
    encryptedChannelMaskable: false,
    isBotVBotPaused: isBotVBot ? isBotVBotPaused : undefined,
    canApplyBotVBotStep: isBotVBot
      ? Boolean(plannedOwnBoardShot || plannedOpponentBoardShot)
      : undefined,
    onToggleBotVBotPause: isBotVBot ? toggleBotVBotPause : undefined,
    onStepBotVBotTurn: isBotVBot ? stepBotVBotTurn : undefined,
  };

  const localState_: GamePlayScreenModel['state'] = {
    phase: localPhase,
    result: localResult,
    onPlayAgain: () =>
      navigate(
        localMode === 'botvbot' ? '/game/bot-setup' : '/game/setup',
        { state: { mode: localMode } },
      ),
  };

  return (
    <GamePlayScreen
      key={`local:${localMode}`}
      model={{
        header: localHeader,
        battlefield: localBattlefield,
        missionLog: { entries: logEntries, heightClassName: 'h-11 sm:h-32' },
        actions: localActions,
        state: localState_,
      }}
    />
  );
}
