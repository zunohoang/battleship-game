import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { images } from '@/assets';
import { SettingsModal } from '@/components/modal/SettingsModal';
import {
  BattleBoardPanel,
} from '@/components/game-play/GamePlayBattlefield';
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
import { useGlobalContext } from '@/hooks/useGlobalContext';
import { useLocalGamePlaySession } from '@/hooks/useLocalGamePlaySession';
import { useOnlineGamePlaySession } from '@/hooks/useOnlineGamePlaySession';
import { usePlayerProfiles } from '@/hooks/usePlayerProfiles';
import type {
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
export type GamePlayHeaderTimerTone = 'default' | 'warning' | 'muted';

export interface GamePlayHeaderSideContent {
  avatarSrc: string | null;
  label?: string;
  name: string;
  signature: string;
  align?: 'left' | 'right';
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
    turnTimerValue: string;
    turnTimerTone?: GamePlayHeaderTimerTone;
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
    revealOpponentShips: boolean;
    onFire?: (x: number, y: number) => void;
    isBotVBot: boolean;
  };
  missionLog: {
    entries: MissionLogEntry[];
    subtitle?: string;
    heightClassName?: string;
    chatMessages?: ChatMessage[];
    currentUserId?: string | null;
    chatDisabled?: boolean;
    onSendChatMessage?: (content: string) => void;
    resolveChatAuthorLabel?: (senderId: string) => string;
  };
  actions: {
    onQuit: () => void;
    showEncryptedChannel: boolean;
    encryptedChannelValue?: string;
    encryptedChannelMaskable?: boolean;
    encryptedChannelMaskedValue?: string;
  };
  state: {
    phase: GamePhase;
    result: GameResult | null;
    onPlayAgain: () => void;
  };
}

function createHeaderContent({
  avatarSrc,
  label,
  name,
  fallbackName,
  signature,
  fallbackSignature = '- - -',
  align,
}: {
  avatarSrc?: string | null;
  label?: string;
  name?: string | null;
  fallbackName: string;
  signature?: string | null;
  fallbackSignature?: string;
  align: 'left' | 'right';
}): GamePlayHeaderSideContent {
  return {
    avatarSrc: avatarSrc?.trim() || null,
    label,
    name: name?.trim() || fallbackName,
    signature: signature?.trim() || fallbackSignature,
    align,
  };
}

type StatsDisplayState = 'hidden' | 'minimized' | 'open';

function GamePlayScreen({
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
  const [isEncryptedChannelMasked, setEncryptedChannelMasked] = useState(
    () => Boolean(model?.actions.encryptedChannelMaskable),
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

    setStatsDisplayState((current) =>
      current === 'open' ? 'hidden' : 'open',
    );
  };

  // Skeleton 
  if (!model) {
    return (
      <GamePlayShell sectionClassName='ui-hud-shell mx-auto flex h-full w-full max-w-3xl items-center justify-center rounded-md p-4'>
        <div className='ui-panel ui-panel-strong w-full max-w-xl rounded-md p-6 text-center'>
          <p className='ui-data-label'>{loadingFallback?.label ?? 'GAMEPLAY'}</p>
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
  const isStatsVisible = state.phase === 'gameover' || statsDisplayState === 'open';
  const isStatsMinimized = state.phase === 'gameover' && statsDisplayState === 'minimized';
  const isSettingsExpanded = isStatsVisible && !isStatsMinimized;
  const encryptedChannelValue = actions.encryptedChannelValue ?? '77.2';
  const encryptedChannelDisplay =
    actions.encryptedChannelMaskable && isEncryptedChannelMasked
      ? actions.encryptedChannelMaskedValue ?? '***'
      : encryptedChannelValue;

  const handleQuit = () => {
    stopBackgroundMusic();
    actions.onQuit();
  };

  const handleSendChat = () => {
    const content = chatDraft.trim();
    if (!content || !missionLog.onSendChatMessage || missionLog.chatDisabled) {
      return;
    }

    missionLog.onSendChatMessage(content);
    setChatDraft('');
  };

  return (
    <GamePlayShell>
      <div className='flex h-[calc(100dvh-2rem)] min-h-[calc(100dvh-2rem)] flex-col gap-1.5 sm:h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-4rem)] sm:gap-2 md:h-auto md:min-h-0 md:flex-1 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:grid-rows-[auto_minmax(0,1fr)] md:gap-3'>
        {/* Left header based on 2 device type */}
        <div className='order-1 shrink-0 md:hidden'>
          <GamePlayIdentityCard content={header.leftContent} />
        </div>
        <div className='hidden md:col-start-1 md:row-start-1 md:block lg:w-[30rem] md:justify-self-start'>
          <GamePlayIdentityCard content={header.leftContent} />
        </div>

        {/* Turn status on desktop device */}
        <div className='hidden md:col-start-1 md:col-end-4 md:row-start-1 md:block md:pointer-events-none'>
          <div className='relative h-full min-h-[4.75rem]'>
            <div className='absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-4'>
              <GamePlayTurnStatus
                turnKey={header.turnKey}
                turnLabel={header.turnLabel}
                turnTone={header.turnTone}
                turnTimerValue={header.turnTimerValue}
                turnTimerTone={header.turnTimerTone}
                className='pointer-events-auto md:w-auto md:min-w-[15rem] md:max-w-[18rem]'
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
              rootClassName='h-full gap-1.5 sm:gap-2'
              panelClassName='p-1.5 sm:p-3'
              boardProps={{
                boardConfig: battlefield.boardConfig,
                ships: battlefield.ships,
                placements: battlefield.ownPlacements,
                shots: battlefield.incomingShots,
                revealShips: true,
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
            turnTimerTone={header.turnTimerTone}
          />
        </div>

        {/* Opponent panel */}
        <div className='order-4 min-h-0 basis-0 flex-1 md:col-start-3 md:row-start-2'>
          <div className='h-full min-h-0'>
            <BattleBoardPanel
              tone='hostile'
              title={battlefield.opponentTitle}
              rootClassName='h-full gap-1.5 sm:gap-2'
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
              }}
              overlay={
                <AnimatePresence>
                  {isStatsVisible ? (
                    <StatsOverlay
                      playerShots={battlefield.ownShots}
                      botShots={battlefield.incomingShots}
                      isBotVBot={battlefield.isBotVBot}
                      onClose={() => setStatsDisplayState('hidden')}
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
        <div className='hidden md:col-start-3 md:row-start-1 md:block lg:w-[30rem] md:justify-self-end'>
          <GamePlayIdentityCard content={header.rightContent} />
        </div>
        <div className='order-5 shrink-0 md:hidden'>
          <GamePlayIdentityCard content={header.rightContent} />
        </div>

        {/* VS divider, disabled on mobile */}
        <div className='hidden md:flex md:col-start-2 md:row-start-2 md:flex-col md:items-center md:justify-center md:gap-3 md:px-1'>
          <div
            className='h-full w-px opacity-70'
            style={{ background: 'linear-gradient(to bottom, transparent, var(--border-main))' }}
          />
          <p className='font-mono text-lg font-black tracking-[0.22em] text-(--text-subtle)'>
            VS
          </p>
          <div
            className='h-full w-px opacity-70'
            style={{ background: 'linear-gradient(to bottom, var(--border-main), transparent)' }}
          />
        </div>
      </div>

      <div className='mt-2 ui-panel overflow-hidden rounded-md md:mt-3'>
        <MissionLogPanel
          className='px-3 pt-3 pb-2 sm:px-4'
          title={t('gameBattle.missionLog')}
          subtitle={missionLog.subtitle}
          entries={missionLog.entries}
          chatMessages={missionLog.chatMessages}
          currentUserId={missionLog.currentUserId}
          isChatDisabled={missionLog.chatDisabled}
          onSendMessage={missionLog.onSendChatMessage}
          resolveChatAuthorLabel={missionLog.resolveChatAuthorLabel}
          showComposer={false}
          logHeightClassName={missionLog.heightClassName ?? 'h-11 sm:h-32'}
        />

        {/* Bottom panel */}
        <div className='border-t border-(--border-main) flex flex-col gap-2 px-3 py-2 sm:px-4 md:flex-row md:items-center md:justify-between'>
          <div className='flex flex-wrap items-center gap-2 md:flex-nowrap'>
            {/* Chat input */}
            {missionLog.onSendChatMessage ? (
              <div className='flex min-w-0 items-center gap-2 md:ml-2 md:flex-1'>
                <button
                  type='button'
                  onClick={handleSendChat}
                  disabled={missionLog.chatDisabled || chatDraft.trim().length === 0}
                  className='cursor-pointer rounded-sm border border-[rgba(117,235,255,0.68)] bg-[rgba(117,235,255,0.12)] px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-(--accent-secondary) transition-colors hover:bg-[rgba(117,235,255,0.18)] disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {t('gameBattle.chatSend')}
                </button>
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
                  disabled={missionLog.chatDisabled}
                  maxLength={280}
                  className='w-64 flex-1 rounded-sm border border-(--border-main) bg-[rgba(4,12,20,0.8)] px-3 py-2 font-mono text-[11px] text-(--text-main) outline-none transition-colors placeholder:text-(--text-muted) focus:border-[rgba(117,235,255,0.72)] disabled:cursor-not-allowed disabled:opacity-60'
                />
              </div>
            ) : null}

            {/* Quit btn */}
            <Button onClick={handleQuit} className='h-8 px-3 text-[10px] md:w-auto'>
              {t('gameBattle.quitMission')}
            </Button>
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
                    onClick={() => setEncryptedChannelMasked((current) => !current)}
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
  return typeof state?.roomId === 'string' && typeof state?.matchId === 'string';
}

// Page included all logics for game panel
export function GamePlayPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useGlobalContext();
  const state = location.state as GamePlayLocationState | null;
  const isOnlineMode = state?.mode === 'online';
  const localState = isValidLocalGamePlayState(state) ? state : null;
  const onlineState = hasOnlineMatchState(state) ? state : null;
  const localMode = localState?.mode === 'botvbot' ? 'botvbot' : 'bot';
  const localAiDifficulty = localState?.aiDifficulty ?? 'random';

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
  } = useLocalGamePlaySession({
    mode: localMode,
    config: localState?.config ?? EMPTY_GAME_CONFIG,
    playerPlacements: localState?.placements ?? EMPTY_PLACEMENTS,
    initialBotPlacements: localState?.botPlacements,
    aiDifficulty: localState?.aiDifficulty ?? 'random',
    t,
    enabled: !isOnlineMode && !!localState,
  });
  const {
    room,
    match,
    chat,
    model: onlineModel,
    phase: onlinePhase,
    result: onlineResult,
    loadingFallback,
  } = useOnlineGamePlaySession({
    roomId: onlineState?.roomId ?? '',
    matchId: onlineState?.matchId ?? '',
    fallbackConfig: onlineState?.config,
    fallbackPlacements: onlineState?.placements,
    enabled: isOnlineMode && !!onlineState,
  });
  const currentUserId = user?.id ?? null;
  const onlineOpponentId =
    currentUserId === match?.player1Id
      ? match.player2Id
      : currentUserId === match?.player2Id
        ? match.player1Id
        : null;
  const { getProfileById } = usePlayerProfiles([currentUserId, onlineOpponentId]);
  const currentPlayerProfile = getProfileById(currentUserId);
  const opponentProfile = getProfileById(onlineOpponentId);
  const resolveOnlineChatAuthorLabel = useCallback(
    (senderId: string) => {
      if (senderId === currentUserId) {
        return currentPlayerProfile?.username?.trim() || user?.username?.trim() || t('gameBattle.chatYouLabel');
      }

      if (senderId === onlineOpponentId) {
        return opponentProfile?.username?.trim() || t('gameBattle.chatOpponentLabel');
      }

      return t('gameBattle.chatOpponentLabel');
    },
    [
      currentPlayerProfile?.username,
      currentUserId,
      onlineOpponentId,
      opponentProfile?.username,
      t,
      user?.username,
    ],
  );
  const onlineLeftHeaderContent = createHeaderContent({
    avatarSrc: currentPlayerProfile?.avatar ?? user?.avatar,
    label: 'COMMANDER',
    name: currentPlayerProfile?.username ?? user?.username,
    fallbackName: 'Commander',
    signature: currentPlayerProfile?.signature ?? user?.signature,
    align: 'left',
  });
  const onlineRightHeaderContent = createHeaderContent({
    avatarSrc: opponentProfile?.avatar,
    label: 'OPPONENT',
    name: opponentProfile?.username,
    fallbackName: onlineOpponentId ? `#${onlineOpponentId.slice(0, 8)}` : 'Opponent',
    signature: opponentProfile?.signature,
    align: 'right',
  });

  useEffect(() => {
    if (isOnlineMode) {
      if (!onlineState) {
        navigate('/game/rooms', { replace: true });
      }
      return;
    }

    if (!localState) {
      navigate('/game/setup', { replace: true });
    }
  }, [isOnlineMode, localState, navigate, onlineState]);

  useEffect(() => {
    if (!isOnlineMode || !onlineState || !room) {
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
  }, [isOnlineMode, match?.id, navigate, onlineState, room]);

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
            chatDisabled: !room || !match,
            onSendChatMessage: chat.sendMessage,
            resolveChatAuthorLabel: resolveOnlineChatAuthorLabel,
          },
          actions: {
            onQuit: () => navigate('/game/rooms'),
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
        signature: 'RANDOM',
        fallbackSignature: 'RANDOM',
        align: 'left',
      })
      : createHeaderContent({
        avatarSrc: user?.avatar,
        label: 'COMMANDER',
        name: user?.username,
        fallbackName: 'Alpha',
        signature: user?.signature,
        align: 'left',
      });
  const rightHeaderContent =
    localMode === 'botvbot'
      ? createHeaderContent({
        avatarSrc: images.botAvatar,
        label: 'BOT',
        name: 'BOT B',
        fallbackName: 'BOT B',
        signature: 'RANDOM',
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

  return (
    <GamePlayScreen
      key={`local:${localMode}`}
      model={{
        header: {
          leftContent: leftHeaderContent,
          rightContent: rightHeaderContent,
          turnKey: turn,
          turnLabel,
          turnTone: isBotThinking ? 'alert' : 'active',
          turnTimerValue: isBotThinking || isBotVBot ? '--:--' : timerDisplay,
          turnTimerTone:
            isBotThinking || isBotVBot
              ? 'muted'
              : timer <= 10
                ? 'warning'
                : 'default',
        },
        battlefield: {
          boardConfig,
          ships,
          shipsById,
          ownPlacements: playerPlacements,
          opponentPlacements: botPlacements,
          ownShots: playerShots,
          incomingShots: botShots,
          ownTitle: isBotVBot ? t('gameBattle.botAFleet') : t('gameBattle.myFleet'),
          opponentTitle: isBotVBot
            ? t('gameBattle.botBFleet')
            : t('gameBattle.enemyWaters'),
          canFire: canPlayerFire,
          revealOpponentShips: localPhase === 'gameover' || isBotVBot,
          onFire: isBotVBot ? undefined : handlePlayerFire,
          isBotVBot,
        },
        missionLog: {
          entries: logEntries,
          subtitle: t('gameBattle.systemVersion'),
          heightClassName: 'h-11 sm:h-32',
        },
        actions: {
          onQuit: () => navigate('/home'),
          showEncryptedChannel: true,
          encryptedChannelValue: '77.2',
          encryptedChannelMaskable: false,
        },
        state: {
          phase: localPhase,
          result: localResult,
          onPlayAgain: () => navigate('/game/setup', { state: { mode: localMode } }),
        },
      }}
    />
  );
}
