import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AiDifficulty,
  BotVBotSettings,
  GameConfig,
  GameMode,
  GamePhase,
  GameResult,
  MissionLogEntry,
  PlacedShip,
  ShipDefinition,
  Shot,
  TurnOwner,
} from '@/types/game';
import { DEFAULT_TURN_TIMER_SECONDS } from '@/constants/gameDefaults';
import {
  buildOccupiedMap,
  buildRandomPlacements,
  buildStrategicPlacements,
  buildShipInstances,
  cellKey,
} from '@/services/bots/core/shared/placementUtils';
import {
  botFireRandom,
  buildBotHeatMap,
  checkAllSunk,
  getBotShot,
  makeLog,
  toCoordLabel,
} from '@/utils/gamePlayUtils';

type LocalGameMode = Extract<GameMode, 'bot' | 'botvbot'>;
type PlayerAttackActor = 'player' | 'botA';
type Translate = (key: string, options?: Record<string, unknown>) => string;

interface UseLocalGamePlaySessionParams {
  mode: LocalGameMode;
  config: GameConfig;
  playerPlacements: PlacedShip[];
  initialBotPlacements?: PlacedShip[];
  aiDifficulty: AiDifficulty;
  botVBotSettings?: BotVBotSettings;
  t: Translate;
  enabled?: boolean;
}

interface UseLocalGamePlaySessionResult {
  boardConfig: GameConfig['boardConfig'];
  ships: ShipDefinition[];
  shipsById: Map<string, ShipDefinition>;
  playerPlacements: PlacedShip[];
  botPlacements: PlacedShip[];
  playerShots: Shot[];
  botShots: Shot[];
  turn: TurnOwner;
  phase: GamePhase;
  result: GameResult | null;
  timer: number;
  turnLabel: string;
  isBotVBot: boolean;
  isBotThinking: boolean;
  canPlayerFire: boolean;
  logEntries: MissionLogEntry[];
  handlePlayerFire: (x: number, y: number) => void;
  ownBoardHeatMap: Map<string, number>;
  opponentBoardHeatMap: Map<string, number>;
  isBotVBotPaused: boolean;
  toggleBotVBotPause: () => void;
  stepBotVBotTurn: () => void;
  plannedOwnBoardShot: { x: number; y: number } | null;
  plannedOpponentBoardShot: { x: number; y: number } | null;
}

export function useLocalGamePlaySession({
  mode,
  config,
  playerPlacements,
  initialBotPlacements,
  aiDifficulty,
  botVBotSettings,
  t,
  enabled = true,
}: UseLocalGamePlaySessionParams): UseLocalGamePlaySessionResult {
  const isBotVBot = mode === 'botvbot';
  const { boardConfig, ships } = config;
  const turnTimerSeconds = Math.max(
    1,
    config.turnTimerSeconds || DEFAULT_TURN_TIMER_SECONDS,
  );
  const shipsById = useMemo(
    () => new Map(ships.map((ship) => [ship.id, ship])),
    [ships],
  );
  const botADifficulty = botVBotSettings?.botA.difficulty ?? 'random';
  const botBDifficulty = botVBotSettings?.botB.difficulty ?? 'random';

  const [botPlacements] = useState<PlacedShip[]>(() => {
    if (initialBotPlacements?.length) {
      return initialBotPlacements;
    }

    const shipInstances = buildShipInstances(ships);

    if (isBotVBot) {
      const strategy = botVBotSettings?.botB.placementStrategy ?? 'random';
      if (strategy === 'strategic') {
        return (
          buildStrategicPlacements(shipInstances, boardConfig, shipsById) ??
          buildRandomPlacements(shipInstances, boardConfig, shipsById) ??
          []
        );
      }

      return buildRandomPlacements(shipInstances, boardConfig, shipsById) ?? [];
    }

    if (aiDifficulty === 'probability') {
      return (
        buildStrategicPlacements(shipInstances, boardConfig, shipsById) ??
        buildRandomPlacements(shipInstances, boardConfig, shipsById) ??
        []
      );
    }

    return buildRandomPlacements(shipInstances, boardConfig, shipsById) ?? [];
  });

  const botOccupied = useMemo(
    () => buildOccupiedMap(botPlacements, shipsById),
    [botPlacements, shipsById],
  );
  const playerOccupied = useMemo(
    () => buildOccupiedMap(playerPlacements, shipsById),
    [playerPlacements, shipsById],
  );

  const [playerShots, setPlayerShots] = useState<Shot[]>([]);
  const [botShots, setBotShots] = useState<Shot[]>([]);
  const [turn, setTurn] = useState<TurnOwner>('player');
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [result, setResult] = useState<GameResult | null>(null);
  const [timer, setTimer] = useState(turnTimerSeconds);
  const [isBotVBotPaused, setIsBotVBotPaused] = useState(isBotVBot);
  const [logEntries, setLogEntries] = useState<MissionLogEntry[]>(() => [
    makeLog(t('gameBattle.logInit'), 'info'),
  ]);

  const playerShotsRef = useRef(playerShots);
  const botShotsRef = useRef(botShots);
  const turnRef = useRef(turn);
  const phaseRef = useRef(phase);
  const timerRef = useRef(timer);
  const autoFiredRef = useRef(false);

  useEffect(() => {
    playerShotsRef.current = playerShots;
  }, [playerShots]);

  useEffect(() => {
    botShotsRef.current = botShots;
  }, [botShots]);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  const isBotVBotPausedEffective =
    isBotVBot && phase === 'playing' && isBotVBotPaused;

  const appendLog = useCallback(
    (message: string, highlight?: MissionLogEntry['highlight']) => {
      setLogEntries((current) => [...current, makeLog(message, highlight)]);
    },
    [],
  );

  const resetPlayerTimer = useCallback(() => {
    autoFiredRef.current = false;
    timerRef.current = turnTimerSeconds;
    setTimer(turnTimerSeconds);
  }, [turnTimerSeconds]);

  const finishGame = useCallback((nextResult: GameResult) => {
    phaseRef.current = 'gameover';
    setPhase('gameover');
    setResult(nextResult);
  }, []);

  const processPlayerAttack = useCallback(
    (x: number, y: number, actor: PlayerAttackActor = 'player') => {
      if (!enabled || phaseRef.current !== 'playing') {
        return;
      }

      if (playerShotsRef.current.some((shot) => shot.x === x && shot.y === y)) {
        return;
      }

      const isHit = !!botOccupied.get(cellKey(x, y));
      const nextShots = [...playerShotsRef.current, { x, y, isHit }];
      playerShotsRef.current = nextShots;
      setPlayerShots(nextShots);

      const messageKey =
        actor === 'botA'
          ? isHit
            ? 'gameBattle.logBotAHit'
            : 'gameBattle.logBotAMiss'
          : isHit
            ? 'gameBattle.logYouHit'
            : 'gameBattle.logYouMiss';

      appendLog(
        t(messageKey, { coord: toCoordLabel(x, y) }),
        isHit ? 'friendly' : 'miss',
      );

      if (checkAllSunk(botPlacements, shipsById, nextShots)) {
        appendLog(
          t(
            actor === 'botA'
              ? 'gameBattle.logBotBFleetSunk'
              : 'gameBattle.logEnemyFleetSunk',
          ),
          'critical',
        );
        finishGame('player_wins');
        return;
      }

      if (isHit) {
        turnRef.current = 'player';
        setTurn('player');
        if (actor === 'player') {
          resetPlayerTimer();
        }
        return;
      }

      turnRef.current = 'bot';
      setTurn('bot');
    },
    [
      appendLog,
      botOccupied,
      botPlacements,
      enabled,
      finishGame,
      resetPlayerTimer,
      shipsById,
      t,
    ],
  );

  const handlePlayerFire = useCallback(
    (x: number, y: number) => {
      if (
        !enabled ||
        phaseRef.current !== 'playing' ||
        turnRef.current !== 'player'
      ) {
        return;
      }

      processPlayerAttack(x, y, 'player');
    },
    [enabled, processPlayerAttack],
  );

  const processBotAttack = useCallback(
    (x: number, y: number) => {
      if (!enabled || phaseRef.current !== 'playing') {
        return;
      }

      if (botShotsRef.current.some((shot) => shot.x === x && shot.y === y)) {
        return;
      }

      const isHit = !!playerOccupied.get(cellKey(x, y));
      const nextShots = [...botShotsRef.current, { x, y, isHit }];
      botShotsRef.current = nextShots;
      setBotShots(nextShots);

      appendLog(
        t(isHit ? 'gameBattle.logEnemyHit' : 'gameBattle.logEnemyMiss', {
          coord: toCoordLabel(x, y),
        }),
        isHit ? 'enemy' : 'miss',
      );

      if (checkAllSunk(playerPlacements, shipsById, nextShots)) {
        appendLog(
          t(
            isBotVBot
              ? 'gameBattle.logBotAFleetSunk'
              : 'gameBattle.logYourFleetSunk',
          ),
          'critical',
        );
        finishGame('bot_wins');
        return;
      }

      if (isHit) {
        turnRef.current = 'bot';
        setTurn('bot');
        return;
      }

      turnRef.current = 'player';
      setTurn('player');
      resetPlayerTimer();
    },
    [
      appendLog,
      enabled,
      finishGame,
      isBotVBot,
      playerOccupied,
      playerPlacements,
      resetPlayerTimer,
      shipsById,
      t,
    ],
  );

  const toggleBotVBotPause = useCallback(() => {
    if (!isBotVBot || phaseRef.current !== 'playing') {
      return;
    }

    setIsBotVBotPaused((current) => !current);
  }, [isBotVBot]);

  const plannedOwnBoardShot = useMemo(() => {
    if (
      !enabled ||
      !isBotVBot ||
      phase !== 'playing' ||
      turn !== 'bot'
    ) {
      return null;
    }

    return getBotShot(
      boardConfig,
      ships,
      botShots,
      botBDifficulty,
      playerPlacements,
      shipsById,
    );
  }, [
    boardConfig,
    botBDifficulty,
    botShots,
    enabled,
    isBotVBot,
    phase,
    playerPlacements,
    ships,
    shipsById,
    turn,
  ]);

  const plannedOpponentBoardShot = useMemo(() => {
    if (
      !enabled ||
      !isBotVBot ||
      phase !== 'playing' ||
      turn !== 'player'
    ) {
      return null;
    }

    return getBotShot(
      boardConfig,
      ships,
      playerShots,
      botADifficulty,
      botPlacements,
      shipsById,
    );
  }, [
    boardConfig,
    botADifficulty,
    botPlacements,
    enabled,
    isBotVBot,
    phase,
    playerShots,
    ships,
    shipsById,
    turn,
  ]);

  const stepBotVBotTurn = useCallback(() => {
    if (
      !isBotVBot ||
      phaseRef.current !== 'playing' ||
      !isBotVBotPausedEffective
    ) {
      return;
    }

    if (turnRef.current === 'bot' && plannedOwnBoardShot) {
      processBotAttack(plannedOwnBoardShot.x, plannedOwnBoardShot.y);
      return;
    }

    if (turnRef.current === 'player' && plannedOpponentBoardShot) {
      processPlayerAttack(
        plannedOpponentBoardShot.x,
        plannedOpponentBoardShot.y,
        'botA',
      );
    }
  }, [
    isBotVBot,
    isBotVBotPausedEffective,
    plannedOpponentBoardShot,
    plannedOwnBoardShot,
    processBotAttack,
    processPlayerAttack,
  ]);

  useEffect(() => {
    if (!enabled || isBotVBot || phase !== 'playing' || turn !== 'player') {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (turnRef.current !== 'player' || phaseRef.current !== 'playing') {
        return;
      }

      const nextTimer = Math.max(0, timerRef.current - 1);
      timerRef.current = nextTimer;
      setTimer(nextTimer);

      if (nextTimer !== 0 || autoFiredRef.current) {
        return;
      }

      autoFiredRef.current = true;
      const target = botFireRandom(boardConfig, playerShotsRef.current);
      if (!target) {
        return;
      }

      processPlayerAttack(target.x, target.y, 'player');
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [boardConfig, enabled, isBotVBot, phase, processPlayerAttack, turn]);

  useEffect(() => {
    if (!enabled || phase !== 'playing' || turn !== 'bot') {
      return;
    }

    if (isBotVBot && isBotVBotPausedEffective) {
      return;
    }

    let cancelled = false;
    const delay = isBotVBot ? 700 : 1300;

    const timeoutId = window.setTimeout(() => {
      if (cancelled || phaseRef.current !== 'playing') {
        return;
      }

      const currentShots = botShotsRef.current;
      const target = isBotVBot
        ? plannedOwnBoardShot
        : getBotShot(
          boardConfig,
          ships,
          currentShots,
          aiDifficulty,
          playerPlacements,
          shipsById,
        );

      if (!target) {
        return;
      }

      processBotAttack(target.x, target.y);
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    aiDifficulty,
    boardConfig,
    botBDifficulty,
    botShots,
    enabled,
    isBotVBot,
    isBotVBotPausedEffective,
    phase,
    plannedOwnBoardShot,
    playerPlacements,
    processBotAttack,
    ships,
    shipsById,
    turn,
  ]);

  useEffect(() => {
    if (!enabled || !isBotVBot || phase !== 'playing' || turn !== 'player') {
      return;
    }

    if (isBotVBotPausedEffective) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      if (cancelled || phaseRef.current !== 'playing') {
        return;
      }

      const target = plannedOpponentBoardShot;
      if (!target) {
        return;
      }

      processPlayerAttack(target.x, target.y, 'botA');
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    boardConfig,
    botADifficulty,
    botPlacements,
    enabled,
    isBotVBot,
    isBotVBotPausedEffective,
    phase,
    plannedOpponentBoardShot,
    playerShots,
    processPlayerAttack,
    ships,
    shipsById,
    turn,
  ]);

  const turnLabel = isBotVBot
    ? turn === 'player'
      ? t('gameBattle.botATurn')
      : t('gameBattle.botBTurn')
    : turn === 'player'
      ? t('gameBattle.yourTurn')
      : t('gameBattle.enemyTurn');

  // Heatmap should only be available in bot-vs-bot mode.
  const ownBoardHeatMap = useMemo(
    () =>
      isBotVBot
        ? buildBotHeatMap(
          boardConfig,
          ships,
          botShots,
          botBDifficulty,
          playerPlacements,
          shipsById,
        )
        : new Map<string, number>(),
    [boardConfig, botBDifficulty, botShots, isBotVBot, playerPlacements, ships, shipsById],
  );

  // Heatmap of Bot A targeting the bot's board (only in botvbot mode)
  const opponentBoardHeatMap = useMemo(
    () =>
      isBotVBot
        ? buildBotHeatMap(
          boardConfig,
          ships,
          playerShots,
          botADifficulty,
          botPlacements,
          shipsById,
        )
        : new Map<string, number>(),
    [boardConfig, botADifficulty, botPlacements, isBotVBot, playerShots, ships, shipsById],
  );

  return {
    boardConfig,
    ships,
    shipsById,
    playerPlacements,
    botPlacements,
    playerShots,
    botShots,
    turn,
    phase,
    result,
    timer,
    turnLabel,
    isBotVBot,
    isBotThinking: enabled && turn === 'bot' && phase === 'playing',
    canPlayerFire:
      enabled && !isBotVBot && turn === 'player' && phase === 'playing',
    logEntries,
    handlePlayerFire,
    ownBoardHeatMap,
    opponentBoardHeatMap,
    isBotVBotPaused: isBotVBotPausedEffective,
    toggleBotVBotPause,
    stepBotVBotTurn,
    plannedOwnBoardShot,
    plannedOpponentBoardShot,
  };
}
