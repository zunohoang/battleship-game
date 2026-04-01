import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameSetup } from '@/store/gameSetupContext';
import {
  DEFAULT_GAME_CONFIG,
  DEFAULT_SETUP_TIMER_SECONDS,
} from '@/constants/gameDefaults';
import { Phase1SetupStage } from '@/components/game-setup/Phase1SetupStage';
import { BotVsBotMenu } from '@/components/game-setup/BotVsBotMenu';
import { Button } from '@/components/ui/Button';
import { ShipPlacementStage } from '@/components/game-setup/ShipPlacementStage';
import { useOnlineRoom } from '@/hooks/useOnlineRoom';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import {
  buildStrategicPlacements,
  buildRandomPlacements,
  buildShipInstances,
} from '@/services/bots/core/shared/placementUtils';
import type {
  AiDifficulty,
  BotPlacementStrategy,
  BotVBotSettings,
  GameMode,
  OnlineSetupFlow,
  PlacedShip,
} from '@/types/game';

type LocationState = {
  mode?: GameMode;
  roomId?: string;
  matchId?: string;
  onlineSetupFlow?: OnlineSetupFlow;
};

interface StepPillProps {
  number: number;
  label: string;
  phaseLabel: string;
  status: 'active' | 'done' | 'upcoming';
}
type HeaderFlow = 'standard' | 'onlinePhase1' | 'onlinePlacement';

interface HeaderStepPill {
  number: number;
  label: string;
  phaseLabel: string;
  status: StepPillProps['status'];
}

function StepPill({ number, label, phaseLabel, status }: StepPillProps) {
  const active = status === 'active';
  const done = status === 'done';

  return (
    <motion.div
      layout
      className={`w-full rounded-md border px-4 py-2 sm:w-auto ${
        active
          ? 'border-[rgba(117,235,255,0.95)] bg-[rgba(34,211,238,0.16)] text-(--text-main) shadow-[0_0_18px_rgba(0,174,255,0.18)]'
          : done
            ? 'ui-state-done text-(--accent-secondary)'
            : 'ui-state-idle text-(--text-muted)'
      }`}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className='flex items-center gap-3'>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-black ${
            active
              ? 'border-[rgba(117,235,255,0.92)] bg-[rgba(34,211,238,0.18)] text-(--text-main)'
              : done
                ? 'border-[rgba(63,203,232,0.48)] bg-[rgba(34,211,238,0.14)] text-(--accent-secondary)'
                : 'border-[rgba(31,136,176,0.36)] bg-transparent text-(--text-muted)'
          }`}
        >
          {done ? '✓' : number}
        </span>
        <div>
          <p className='ui-data-label'>{phaseLabel}</p>
          <p className='mt-1 text-sm font-bold uppercase tracking-[0.08em]'>
            {label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function GameSetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as LocationState | null) ?? null;
  const mode =
    location.pathname === '/game/bot-setup'
      ? 'botvbot'
      : (locationState?.mode ?? 'bot');
  const roomId = locationState?.roomId;
  const matchId = locationState?.matchId;
  const onlineSetupFlow = locationState?.onlineSetupFlow ?? 'placement';
  const isOnlinePhase1Flow = mode === 'online' && onlineSetupFlow === 'phase1';
  const isOnlinePlacementFlow =
    mode === 'online' && onlineSetupFlow === 'placement';
  const { user } = useGlobalContext();
  const currentUserId = user?.id ?? null;

  const {
    state,
    setConfig,
    setBoardConfig,
    setTurnTimerSeconds,
    setPlacements,
    addShipDefinition,
    updateShipDefinition,
    removeShipDefinition,
    clearPlacements,
    setReady,
    resetConfig,
  } = useGameSetup();

  const {
    room,
    match,
    reconnect,
    markReady,
    configureRoomSetup,
    lastError,
    leaveRoom,
  } = useOnlineRoom(roomId, mode === 'online');
  const isRoomOwner = currentUserId !== null && currentUserId === room?.ownerId;

  useEffect(() => {
    if (mode !== 'online' || room?.status !== 'closed') {
      return;
    }

    leaveRoom();
    navigate('/game/rooms', {
      replace: true,
      state: { roomDismissed: 'host_closed' },
    });
  }, [leaveRoom, mode, navigate, room?.status]);

  const hasInitializedOnlineConfig = useRef(false);

  const [step, setStep] = useState<1 | 2>(1);
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('random');
  const [botVBotSettings, setBotVBotSettings] = useState<BotVBotSettings>({
    botA: {
      difficulty: 'random',
      placementStrategy: 'random',
      placementMode: 'auto',
    },
    botB: {
      difficulty: 'random',
      placementStrategy: 'random',
      placementMode: 'auto',
    },
  });
  const [botVBotEditTarget, setBotVBotEditTarget] = useState<'botA' | 'botB'>(
    'botA',
  );
  const [botVBotManualPlacements, setBotVBotManualPlacements] = useState<{
    botA: PlacedShip[];
    botB: PlacedShip[];
  }>({ botA: [], botB: [] });
  const [onlineSetupNowMs, setOnlineSetupNowMs] = useState<number | null>(null);
  const [isSavingPhase1, setIsSavingPhase1] = useState(false);

  const { boardConfig, ships, turnTimerSeconds } = state.config;
  const currentConfig = state.config;
  const currentPlacements = state.placements;
  const hasManualBotA = (botVBotSettings.botA.placementMode ?? 'auto') === 'manual';
  const hasManualBotB = (botVBotSettings.botB.placementMode ?? 'auto') === 'manual';
  const hasAnyManualBot = hasManualBotA || hasManualBotB;
  const resolvedBotVBotEditTarget = useMemo<'botA' | 'botB'>(() => {
    if (mode !== 'botvbot') {
      return botVBotEditTarget;
    }

    if (
      (botVBotSettings[botVBotEditTarget].placementMode ?? 'auto') === 'manual'
    ) {
      return botVBotEditTarget;
    }

    if (hasManualBotA) {
      return 'botA';
    }

    if (hasManualBotB) {
      return 'botB';
    }

    return botVBotEditTarget;
  }, [
    botVBotEditTarget,
    botVBotSettings,
    hasManualBotA,
    hasManualBotB,
    mode,
  ]);

  const buildPlacementsByStrategy = useCallback(
    (strategy: BotPlacementStrategy) => {
      const shipInstances = buildShipInstances(ships);
      const shipsById = new Map(ships.map((ship) => [ship.id, ship]));

      if (strategy === 'strategic') {
        return (
          buildStrategicPlacements(shipInstances, boardConfig, shipsById) ??
          buildRandomPlacements(shipInstances, boardConfig, shipsById)
        );
      }

      return buildRandomPlacements(shipInstances, boardConfig, shipsById);
    },
    [boardConfig, ships],
  );

  const handleNext = () => {
    if (isOnlinePhase1Flow) {
      if (!roomId) return;
      setIsSavingPhase1(true);
      configureRoomSetup({
        roomId,
        boardConfig,
        ships,
        turnTimerSeconds,
      });
      return;
    }

    clearPlacements();
    setBotVBotEditTarget('botA');
    setBotVBotManualPlacements({ botA: [], botB: [] });
    setStep(2);
  };

  const handleBackToConfig = () => {
    clearPlacements();
    setBotVBotEditTarget('botA');
    setBotVBotManualPlacements({ botA: [], botB: [] });
    setStep(1);
  };

  const launchLocalGame = useCallback(
    (placementsOverride?: typeof currentPlacements) => {
      if (mode === 'botvbot') {
        const resolveBotPlacements = (
          botKey: 'botA' | 'botB',
          fallback: PlacedShip[] = [],
        ) => {
          const botSettings = botVBotSettings[botKey];
          if ((botSettings.placementMode ?? 'auto') === 'manual') {
            const manualPlacements = botVBotManualPlacements[botKey];
            const totalRequired = ships.reduce(
              (total, ship) => total + ship.count,
              0,
            );
            return manualPlacements.length >= totalRequired
              ? manualPlacements
              : fallback;
          }

          return (
            buildPlacementsByStrategy(botSettings.placementStrategy) ?? fallback
          );
        };

        const botAPlacements = resolveBotPlacements(
          'botA',
          placementsOverride ?? currentPlacements,
        );
        const botBPlacements = resolveBotPlacements('botB', []);

        navigate('/game/play', {
          state: {
            mode,
            config: currentConfig,
            placements: botAPlacements,
            botPlacements: botBPlacements,
            botVBotSettings,
          },
        });
        return;
      }

      navigate('/game/play', {
        state: {
          mode,
          config: currentConfig,
          placements: placementsOverride ?? currentPlacements,
          aiDifficulty,
        },
      });
    },
    [
      aiDifficulty,
      botVBotManualPlacements,
      botVBotSettings,
      buildPlacementsByStrategy,
      currentConfig,
      currentPlacements,
      mode,
      navigate,
      ships,
    ],
  );

  const totalCells = ships.reduce(
    (sum, ship) => sum + ship.size * ship.count,
    0,
  );
  const boardCells = boardConfig.rows * boardConfig.cols;
  const isConfigValid = ships.length > 0 && totalCells <= boardCells * 0.5;
  const isPhase1SavePending =
    isSavingPhase1 && !lastError && !room?.currentMatchId;
  const requiredShipCount = useMemo(
    () => ships.reduce((total, ship) => total + ship.count, 0),
    [ships],
  );
  const allShipsPlaced =
    requiredShipCount > 0 && state.placements.length === requiredShipCount;
  const botVBotPlacementReady =
    (!hasManualBotA ||
      botVBotManualPlacements.botA.length === requiredShipCount) &&
    (!hasManualBotB ||
      botVBotManualPlacements.botB.length === requiredShipCount);

  useEffect(() => {
    setReady(mode === 'botvbot' ? botVBotPlacementReady : allShipsPlaced);
  }, [allShipsPlaced, botVBotPlacementReady, mode, setReady]);

  useEffect(() => {
    if (mode !== 'online') return;

    if (!roomId) {
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
  }, [matchId, mode, navigate, reconnect, roomId]);

  useEffect(() => {
    if (!isOnlinePhase1Flow) {
      return;
    }

    setConfig(DEFAULT_GAME_CONFIG);
  }, [isOnlinePhase1Flow, setConfig]);

  useEffect(() => {
    if (!isOnlinePlacementFlow || !match) return;
    if (hasInitializedOnlineConfig.current) return;

    hasInitializedOnlineConfig.current = true;
    setConfig({
      boardConfig: match.boardConfig,
      ships: match.ships,
      turnTimerSeconds: match.turnTimerSeconds,
    });

    const syncStepTimeoutId = window.setTimeout(() => {
      setStep(2);
    }, 0);

    return () => {
      window.clearTimeout(syncStepTimeoutId);
    };
  }, [isOnlinePlacementFlow, match, setConfig]);

  useEffect(() => {
    if (!isOnlinePhase1Flow || !isSavingPhase1 || !room || !match) {
      return;
    }

    navigate('/game/waiting', {
      state: {
        roomId: room.roomId,
        matchId: match.id,
      },
    });
  }, [isOnlinePhase1Flow, isSavingPhase1, match, navigate, room]);

  useEffect(() => {
    if (!isOnlinePhase1Flow || isSavingPhase1 || !room?.currentMatchId) {
      return;
    }

    navigate('/game/waiting', {
      state: {
        roomId: room.roomId,
        matchId: match?.id ?? room.currentMatchId,
      },
    });
  }, [isOnlinePhase1Flow, isSavingPhase1, match?.id, navigate, room]);

  useEffect(() => {
    if (mode !== 'online' || !room || !match) return;

    if (room.status === 'in_game' && match.status === 'in_progress') {
      const onlinePlacements =
        currentUserId === match.player1Id
          ? match.player1Placements
          : currentUserId === match.player2Id
            ? match.player2Placements
            : state.placements;

      navigate('/game/play', {
        state: {
          mode: 'online',
          roomId,
          matchId: match.id,
          config: {
            boardConfig: match.boardConfig,
            ships: match.ships,
            turnTimerSeconds: match.turnTimerSeconds,
          },
          placements: onlinePlacements ?? state.placements,
        },
      });
    }
  }, [currentUserId, match, mode, navigate, room, roomId, state.placements]);

  useEffect(() => {
    if (mode !== 'online' || !match?.setupDeadlineAt) {
      const resetTimeoutId = window.setTimeout(() => {
        setOnlineSetupNowMs(null);
      }, 0);

      return () => {
        window.clearTimeout(resetTimeoutId);
      };
    }

    const syncNow = () => {
      setOnlineSetupNowMs(Date.now());
    };

    const syncTimeoutId = window.setTimeout(syncNow, 0);
    const intervalId = window.setInterval(syncNow, 1000);

    return () => {
      window.clearTimeout(syncTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [match?.setupDeadlineAt, mode]);

  const onlineSetupSecondsLeft =
    mode !== 'online' || !match?.setupDeadlineAt || onlineSetupNowMs === null
      ? null
      : Math.max(
        0,
        Math.ceil(
          (new Date(match.setupDeadlineAt).getTime() - onlineSetupNowMs) /
              1000,
        ),
      );
  const setupTimerDisplay =
    step !== 2
      ? t('gameSetup.step1.setupTimerValue', {
        seconds: DEFAULT_SETUP_TIMER_SECONDS,
      })
      : mode === 'online'
        ? onlineSetupSecondsLeft === null
          ? t('gameSetup.step1.setupTimerValue', {
            seconds: DEFAULT_SETUP_TIMER_SECONDS,
          })
          : t('gameSetup.step1.setupTimerCountdown', {
            remaining: onlineSetupSecondsLeft,
            total: DEFAULT_SETUP_TIMER_SECONDS,
          })
        : t('gameSetup.step1.setupTimerValue', {
          seconds: DEFAULT_SETUP_TIMER_SECONDS,
        });
  const canAdjustTurnTimer =
    step === 1 &&
    (mode !== 'online' ||
      (isOnlinePhase1Flow &&
        isRoomOwner &&
        !room?.currentMatchId &&
        !isPhase1SavePending));
  const phase1ContinueDisabled = isOnlinePhase1Flow
    ? !isConfigValid ||
      !roomId ||
      !isRoomOwner ||
      !!room?.currentMatchId ||
      isPhase1SavePending
    : !isConfigValid;
  const phase1ContinueLabel = isOnlinePhase1Flow
    ? isPhase1SavePending
      ? 'Saving Phase 1...'
      : 'Save Phase 1'
    : t('gameSetup.header.nextStep');
  const headerFlow: HeaderFlow = isOnlinePhase1Flow
    ? 'onlinePhase1'
    : isOnlinePlacementFlow
      ? 'onlinePlacement'
      : 'standard';
  const headerStepPills: HeaderStepPill[] =
    headerFlow === 'standard'
      ? [
        {
          number: 1,
          label: t('gameSetup.header.step1Label'),
          phaseLabel: `${t('gameSetup.header.phase')} 1`,
          status: step === 1 ? 'active' : 'done',
        },
        {
          number: 2,
          label: t('gameSetup.header.step2Label'),
          phaseLabel: `${t('gameSetup.header.phase')} 2`,
          status: step === 2 ? 'active' : 'upcoming',
        },
      ]
      : [
        {
          number: headerFlow === 'onlinePhase1' ? 1 : 2,
          label: t(
            headerFlow === 'onlinePhase1'
              ? 'gameSetup.header.step1Label'
              : 'gameSetup.header.step2Label',
          ),
          phaseLabel: t('gameSetup.header.phase'),
          status: 'active',
        },
      ];
  const showSetupTimer = step === 2 && mode === 'online';
  const showHeaderBackButton = headerFlow !== 'onlinePlacement';
  const primaryActionDisabled =
    mode === 'online'
      ? !allShipsPlaced || !roomId || room?.status !== 'setup'
      : mode === 'botvbot'
        ? !botVBotPlacementReady
        : !allShipsPlaced;
  const isOpponentReady =
    mode === 'online'
      ? currentUserId === room?.ownerId
        ? Boolean(room?.guestReady)
        : Boolean(room?.ownerReady)
      : true;

  const handleHeaderBack = () => {
    if (isOnlinePhase1Flow && roomId) {
      navigate('/game/waiting', {
        state: {
          roomId,
          matchId: match?.id ?? matchId,
        },
      });
      return;
    }

    if (step === 2) {
      handleBackToConfig();
      return;
    }

    navigate('/home');
  };

  const handleHeaderPrimaryAction = () => {
    if (mode === 'online') {
      if (!roomId) return;

      markReady({
        roomId,
        placements: state.placements,
      });
      return;
    }

    launchLocalGame();
  };

  return (
    <motion.main
      className='relative min-h-dvh overflow-x-hidden overflow-y-auto px-3 py-3 text-(--text-main) sm:h-screen sm:overflow-hidden sm:px-6 sm:py-4'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className='ui-page-bg -z-20' />
      <div className='absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(50,217,255,0.08),transparent_42%)]' />

      <section className='ui-hud-shell mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-7xl flex-col rounded-md p-3 sm:h-full sm:min-h-0 sm:p-4'>
        <div className='grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center'>
          {/* Info card */}
          <div className='ui-panel ui-panel-glow flex items-center rounded-md px-5 py-3'>
            <div className='relative z-10 flex min-w-0 flex-1 flex-wrap items-center gap-4'>
              <div className='text-(--accent-secondary) flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(117,235,255,0.95)] bg-[rgba(34,211,238,0.12)] font-mono text-lg font-black'>
                C
              </div>
              <div className='min-w-0 flex-1'>
                <p className='truncate font-mono text-base font-black uppercase tracking-widest text-(--accent-secondary) sm:text-lg'>
                  {t('gameSetup.header.commanderName')}
                </p>
                <h1 className='truncate font-mono text-xs font-semibold uppercase tracking-[0.2em] text-(--text-muted) sm:text-xs'>
                  {step === 1
                    ? t('gameSetup.header.title_fleet')
                    : t('gameSetup.header.title_placement')}
                </h1>
              </div>
            </div>
          </div>

          {/* Mode badge */}
          <motion.div
            key='mode-badge'
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className='ui-panel rounded-md px-4 py-3'
          >
            <p className='ui-data-label mb-2'>
              {t('gameSetup.header.gameModeLabel')}
            </p>
            <p className='font-mono text-sm font-bold uppercase tracking-widest text-(--accent-secondary)'>
              {t(`gameSetup.header.modes.${mode}`)}
            </p>
          </motion.div>
          
          {/* Controls */}
          <div className='grid w-full gap-2 sm:flex sm:flex-wrap sm:items-center xl:justify-end'>
            {showSetupTimer ? (
              <div className='ui-panel rounded-md px-4 py-3'>
                <p className='ui-data-label'>
                  {t('gameSetup.step1.setupTimer')}
                </p>
                <p className='mt-1 font-mono text-sm font-bold uppercase tracking-[0.14em] text-(--accent-secondary)'>
                  {setupTimerDisplay}
                </p>
              </div>
            ) : null}
            {headerStepPills.length === 2 ? (
              <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap'>
                <StepPill {...headerStepPills[0]} />
                <div className='hidden items-center px-1 sm:flex' aria-hidden='true'>
                  <span className='h-px w-10 bg-[linear-gradient(90deg,rgba(63,203,232,0.16),rgba(117,235,255,0.82),rgba(63,203,232,0.16))]' />
                </div>
                <StepPill {...headerStepPills[1]} />
              </div>
            ) : (
              <StepPill {...headerStepPills[0]} />
            )}
            {showHeaderBackButton ? (
              <Button
                onClick={handleHeaderBack}
                className='h-10 w-full px-4 sm:w-auto'
              >
                {t('gameSetup.header.back')}
              </Button>
            ) : null}
          </div>
        </div>
        <div className='mt-3 flex-1 overflow-visible sm:min-h-0 sm:overflow-hidden'>
          <AnimatePresence mode='wait'>
            {step === 1 ? (
              <motion.div
                key='fleet'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className='overflow-visible sm:h-full sm:min-h-0 sm:overflow-hidden'
              >
                <Phase1SetupStage
                  boardConfig={boardConfig}
                  ships={ships}
                  turnTimerSeconds={turnTimerSeconds}
                  isConfigValid={isConfigValid}
                  canAdjustTurnTimer={canAdjustTurnTimer}
                  continueDisabled={phase1ContinueDisabled}
                  continueLabel={phase1ContinueLabel}
                  onBoardPreset={(rows, cols) => setBoardConfig({ rows, cols })}
                  onTurnTimerChange={setTurnTimerSeconds}
                  onShipAdd={addShipDefinition}
                  onShipUpdate={updateShipDefinition}
                  onShipRemove={removeShipDefinition}
                  onReset={resetConfig}
                  onContinue={handleNext}
                />
              </motion.div>
            ) : (
              <motion.div
                key='placement'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                className='grid gap-3 overflow-visible sm:h-full sm:min-h-0 sm:overflow-hidden'
              >
                {mode === 'botvbot' ? (
                  <BotVsBotMenu
                    settings={botVBotSettings}
                    onChange={setBotVBotSettings}
                    editTargetBot={resolvedBotVBotEditTarget}
                    onEditTargetBotChange={setBotVBotEditTarget}
                  />
                ) : null}
                {/* Nút bắt đầu game khi ở bot vs bot */}
                {mode === 'botvbot' && !hasAnyManualBot ? (
                  <div className='flex justify-end'>
                    <Button
                      variant='primary'
                      disabled={primaryActionDisabled}
                      onClick={handleHeaderPrimaryAction}
                      className='h-10 px-6'
                    >
                      {t('gameSetup.header.startGame')}
                    </Button>
                  </div>
                ) : null}
                {/* Cả 2 bot đều manual: layout 2 cột song song */}
                {mode === 'botvbot' && hasManualBotA && hasManualBotB ? (
                  <>
                    <div className='grid gap-3 sm:min-h-0 sm:flex-1 xl:grid-cols-2'>
                      {(['botA', 'botB'] as const).map((botKey) => (
                        <section
                          key={botKey}
                          className='ui-panel ui-panel-strong themed-scrollbar flex flex-col rounded-md p-3 sm:min-h-0 sm:p-4'
                        >
                          <p className='ui-panel-title mb-2'>
                            {botKey === 'botA' ? 'BOT A' : 'BOT B'}
                          </p>
                          <div className='flex-1 sm:min-h-0'>
                            <ShipPlacementStage
                              boardConfig={boardConfig}
                              ships={ships}
                              placements={botVBotManualPlacements[botKey]}
                              onPlacementsChange={(placements) =>
                                setBotVBotManualPlacements((current) => ({
                                  ...current,
                                  [botKey]: placements,
                                }))
                              }
                              isOpponentReady={
                                botVBotManualPlacements[
                                  botKey === 'botA' ? 'botB' : 'botA'
                                ].length === requiredShipCount
                              }
                              primaryActionDisabled={true}
                            />
                          </div>
                        </section>
                      ))}
                    </div>
                    <div className='flex justify-end'>
                      <Button
                        variant='primary'
                        disabled={primaryActionDisabled}
                        onClick={handleHeaderPrimaryAction}
                        className='h-10 px-6'
                      >
                        {t('gameSetup.header.startGame')}
                      </Button>
                    </div>
                  </>
                ) : null}
                {/* 1 bot manual hoặc không phải botvbot: layout đơn */}
                {mode !== 'botvbot' || (hasAnyManualBot && !(hasManualBotA && hasManualBotB)) ? (
                  <section className='ui-panel ui-panel-strong themed-scrollbar flex flex-col rounded-md p-3 sm:min-h-0 sm:p-4'>
                    <div className='flex-1 sm:min-h-0'>
                      <ShipPlacementStage
                        boardConfig={boardConfig}
                        ships={ships}
                        placements={
                          mode === 'botvbot'
                            ? botVBotManualPlacements[resolvedBotVBotEditTarget]
                            : state.placements
                        }
                        onPlacementsChange={
                          mode === 'botvbot'
                            ? (placements) =>
                              setBotVBotManualPlacements((current) => ({
                                ...current,
                                [resolvedBotVBotEditTarget]: placements,
                              }))
                            : setPlacements
                        }
                        aiDifficulty={mode === 'bot' ? aiDifficulty : undefined}
                        onAiDifficultyChange={
                          mode === 'bot' ? setAiDifficulty : undefined
                        }
                        isOpponentReady={isOpponentReady}
                        primaryActionDisabled={primaryActionDisabled}
                        onPrimaryAction={handleHeaderPrimaryAction}
                      />
                    </div>
                  </section>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </motion.main>
  );
}
