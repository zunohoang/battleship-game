import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import { useOnlineRoom } from '@/hooks/useOnlineRoom';
import { getUserProfile } from '@/services/authService';
import type {
  GameConfig,
  GamePhase,
  GameResult,
  MatchSnapshot,
  MissionLogEntry,
  PlacedShip,
  RoomSnapshot,
  ShipDefinition,
  Shot,
} from '@/types/game';
import type {
  GamePlayLoadingFallback,
  GamePlayScreenModel,
} from '@/pages/game-play';

import {
  calculateFleetShipStatuses,
  formatLogTime,
  makeLog,
  toBattleShots,
  toCoordLabel,
} from '@/utils/gamePlayUtils';
import type { ChatMessage } from '@/types/chat';

const EMPTY_SHIPS: ShipDefinition[] = [];

function formatTurnTimer(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

type OnlineGamePlayScreenBaseModel = Omit<
  GamePlayScreenModel,
  'actions' | 'state'
>;

interface UseOnlineGamePlaySessionParams {
  roomId: string;
  matchId: string;
  fallbackConfig?: GameConfig;
  fallbackPlacements?: PlacedShip[];
  enabled?: boolean;
}

interface UseOnlineGamePlaySessionResult {
  room: RoomSnapshot | null;
  match: MatchSnapshot | null;
  currentUserId: string | null;
  latencyMs: number | null;
  chat: {
    messages: ChatMessage[];
    sendMessage: (content: string) => void;
  };
  model: OnlineGamePlayScreenBaseModel | null;
  phase: GamePhase;
  result: GameResult | null;
  refresh: () => void;
  loadingFallback: GamePlayLoadingFallback | null;
  leaveRoom: () => void;
}

export function useOnlineGamePlaySession({
  roomId,
  matchId,
  fallbackConfig,
  fallbackPlacements,
  enabled = true,
}: UseOnlineGamePlaySessionParams): UseOnlineGamePlaySessionResult {
  const { t } = useTranslation();
  const { user, setUser } = useGlobalContext();
  const [turnNowMs, setTurnNowMs] = useState<number | null>(null);
  const eloSyncedForMatchRef = useRef<string | null>(null);

  const {
    room,
    match,
    latencyMs,
    connectionState,
    chatMessages,
    lastError,
    reconnect,
    submitMove,
    sendChatMessage,
    leaveRoom,
  } = useOnlineRoom(roomId, enabled);
  const matchIdValue = match?.id ?? null;
  const matchStatus = match?.status ?? null;
  const turnDeadlineAt = match?.turnDeadlineAt ?? null;
  const matchVersion = match?.version ?? null;
  const turnPlayerId = match?.turnPlayerId ?? null;

  const refresh = useCallback(() => {
    if (!enabled) {
      return;
    }

    reconnect({ roomId, matchId });
  }, [enabled, matchId, reconnect, roomId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    refresh();
    const intervalId = window.setInterval(refresh, 1500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, refresh]);

  useEffect(() => {
    if (
      !enabled ||
      !user.id ||
      user.isAnonymous ||
      match?.status !== 'finished' ||
      !match?.id
    ) {
      return;
    }

    if (eloSyncedForMatchRef.current === match.id) {
      return;
    }

    eloSyncedForMatchRef.current = match.id;

    void getUserProfile(user.id).then((profile) => {
      setUser((prev) =>
        !prev.isAnonymous && prev.id === user.id
          ? { ...prev, elo: profile.elo }
          : prev,
      );
    });
  }, [
    user.id,
    enabled,
    match?.id,
    match?.status,
    setUser,
    user,
  ]);

  useEffect(() => {
    if (!enabled || !match || match.status !== 'in_progress') {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      setTurnNowMs(Date.now());
    });
    const intervalId = window.setInterval(() => {
      setTurnNowMs(Date.now());
    }, 1000);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.clearInterval(intervalId);
    };
  }, [enabled, match?.status, match?.turnDeadlineAt, match?.turnPlayerId, match]);

  const boardConfig = match?.boardConfig ?? fallbackConfig?.boardConfig;
  const ships = match?.ships ?? fallbackConfig?.ships ?? EMPTY_SHIPS;
  const shipsById = useMemo(
    () => new Map(ships.map((ship) => [ship.id, ship])),
    [ships],
  );

  const ownPlacements = useMemo(() => {
    if (!match) {
      return fallbackPlacements ?? [];
    }

    if (user.id === match.player1Id) {
      return match.player1Placements ?? [];
    }

    if (user.id === match.player2Id) {
      return match.player2Placements ?? [];
    }

    return fallbackPlacements ?? [];
  }, [user.id, fallbackPlacements, match]);

  const opponentPlacements = useMemo(() => {
    if (!match) {
      return [];
    }

    if (user.id === match.player1Id) {
      return match.player2Placements ?? [];
    }

    if (user.id === match.player2Id) {
      return match.player1Placements ?? [];
    }

    return [];
  }, [user.id, match]);

  const ownShots = useMemo<Shot[]>(() => {
    if (!match) {
      return [];
    }

    if (user.id === match.player1Id) {
      return toBattleShots(match.player1Shots);
    }

    if (user.id === match.player2Id) {
      return toBattleShots(match.player2Shots);
    }

    return [];
  }, [user.id, match]);

  const incomingShots = useMemo<Shot[]>(() => {
    if (!match) {
      return [];
    }

    if (user.id === match.player1Id) {
      return toBattleShots(match.player2Shots);
    }

    if (user.id === match.player2Id) {
      return toBattleShots(match.player1Shots);
    }

    return [];
  }, [user.id, match]);

  const ownFleetStatus = useMemo(
    () => calculateFleetShipStatuses(ownPlacements, shipsById, incomingShots),
    [incomingShots, ownPlacements, shipsById],
  );
  const opponentFleetStatus = useMemo(
    () => calculateFleetShipStatuses(opponentPlacements, shipsById, ownShots),
    [opponentPlacements, ownShots, shipsById],
  );

  const phase: GamePhase =
    enabled && match?.status === 'finished' ? 'gameover' : 'playing';
  const result: GameResult | null =
    enabled && match?.status === 'finished' && match.winnerId
      ? match.winnerId === user.id
        ? 'player_wins'
        : 'bot_wins'
      : null;

  const canFire =
    enabled &&
    !!match &&
    phase === 'playing' &&
    connectionState === 'connected' &&
    match.turnPlayerId === user.id;

  const handlePlayerFire = useCallback(
    (x: number, y: number) => {
      if (!match || !canFire) {
        return;
      }

      if (ownShots.some((shot) => shot.x === x && shot.y === y)) {
        return;
      }

      submitMove({
        matchId: match.id,
        x,
        y,
        clientMoveId: `${Date.now()}-${x}-${y}`,
      });
    },
    [canFire, match, ownShots, submitMove],
  );

  const initialLogEntry = useMemo<MissionLogEntry>(
    () => makeLog(t('gameBattle.logInit'), 'info'),
    [t],
  );

  const logEntries = useMemo<MissionLogEntry[]>(() => {
    if (!match) {
      return [initialLogEntry];
    }

    const history = [...match.player1Shots, ...match.player2Shots].sort(
      (left, right) => left.sequence - right.sequence,
    );
    const finalLogEntry =
      match.status === 'finished' && match.winnerId && user.id
        ? {
          id: -(match.version ?? history.length + 1),
          timestamp: formatLogTime(match.updatedAt),
          message: t(
            match.winnerId === user.id
              ? 'gameBattle.logEnemyFleetSunk'
              : 'gameBattle.logYourFleetSunk',
          ),
          highlight: 'critical' as const,
        }
        : null;

    return [
      initialLogEntry,
      ...history.map((shot) => {
        const isOwnShot = shot.by === user.id;
        const highlight: MissionLogEntry['highlight'] = isOwnShot
          ? shot.isHit
            ? 'friendly'
            : 'miss'
          : shot.isHit
            ? 'enemy'
            : 'miss';
        return {
          id: shot.sequence,
          timestamp: formatLogTime(shot.at),
          message: t(
            isOwnShot
              ? shot.isHit
                ? 'gameBattle.logYouHit'
                : 'gameBattle.logYouMiss'
              : shot.isHit
                ? 'gameBattle.logEnemyHit'
                : 'gameBattle.logEnemyMiss',
            { coord: toCoordLabel(shot.x, shot.y) },
          ),
          highlight,
        };
      }),
      ...(finalLogEntry ? [finalLogEntry] : []),
    ];
  }, [user.id, initialLogEntry, match, t]);

  const turnLabel =
    phase === 'gameover'
      ? result === 'player_wins'
        ? t('gameBattle.result.victory')
        : result === 'bot_wins'
          ? t('gameBattle.result.defeat')
          : 'Standby'
      : canFire
        ? t('gameBattle.yourTurn')
        : t('gameBattle.enemyTurn');
  const turnTimerSecondsLeft = useMemo(() => {
    if (
      !enabled ||
      !match ||
      match.status !== 'in_progress' ||
      turnNowMs === null
    ) {
      return null;
    }

    if (!match.turnDeadlineAt) {
      return null;
    }

    return Math.max(
      0,
      Math.ceil((new Date(match.turnDeadlineAt).getTime() - turnNowMs) / 1000),
    );
  }, [enabled, match, turnNowMs]);

  useEffect(() => {
    if (
      !enabled ||
      matchStatus !== 'in_progress' ||
      !turnDeadlineAt ||
      turnNowMs === null
    ) {
      return;
    }

    const millisecondsLeft = new Date(turnDeadlineAt).getTime() - turnNowMs;
    if (millisecondsLeft > 1000) {
      return;
    }

    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      refresh();

      if (attempts >= 8) {
        window.clearInterval(intervalId);
      }
    }, 200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    enabled,
    matchIdValue,
    matchStatus,
    turnDeadlineAt,
    turnNowMs,
    turnPlayerId,
    matchVersion,
    refresh,
  ]);
  const turnTimerValue =
    turnTimerSecondsLeft === null
      ? '--:--'
      : formatTurnTimer(turnTimerSecondsLeft);

  const loadingFallback = useMemo<GamePlayLoadingFallback | null>(() => {
    if (!enabled || (boardConfig && ships.length > 0)) {
      return null;
    }

    return {
      label: 'ONLINE BATTLE',
      title: 'Syncing match state',
      description:
        lastError ?? 'Waiting for the latest room and match snapshot from the server.',
    };
  }, [boardConfig, enabled, lastError, ships.length]);

  const model = useMemo<OnlineGamePlayScreenBaseModel | null>(() => {
    if (!enabled || !boardConfig || ships.length === 0) {
      return null;
    }

    return {
      header: {
        turnKey: `${match?.version ?? 'pending'}-${turnLabel}`,
        turnLabel,
        turnTone: canFire ? 'active' : 'alert',
        turnTimerValue,
        leftContent: {
          avatarSrc: user.avatar?.trim() || null,
          label: 'COMMANDER',
          name: user.username?.trim() || 'Bạn',
          signature: user.signature?.trim() || '- - -',
          align: 'left',
          elo: user.elo ?? 0,
        },
        rightContent: {
          avatarSrc: null,
          label: 'OPPONENT',
          name: 'Đối thủ',
          signature: '- - -',
          align: 'right',
          elo: 0,
        },
      },
      battlefield: {
        boardConfig,
        ships,
        shipsById,
        ownPlacements,
        opponentPlacements,
        ownShots,
        incomingShots,
        ownFleetStatus,
        opponentFleetStatus,
        ownTitle: t('gameBattle.myFleet'),
        opponentTitle: t('gameBattle.enemyWaters'),
        canFire,
        revealOpponentShips: phase === 'gameover',
        onFire: handlePlayerFire,
        isBotVBot: false,
      },
      missionLog: {
        entries: logEntries,
        heightClassName: 'h-28',
      },
    };
  }, [
    boardConfig,
    canFire,
    enabled,
    handlePlayerFire,
    incomingShots,
    opponentFleetStatus,
    logEntries,
    match,
    opponentPlacements,
    ownFleetStatus,
    ownPlacements,
    ownShots,
    phase,
    ships,
    shipsById,
    t,
    turnLabel,
    turnTimerValue,
    user.avatar,
    user.elo,
    user.signature,
    user.username,
  ]);

  return {
    room,
    match,
    currentUserId: user.id ?? null,
    latencyMs,
    chat: {
      messages: chatMessages,
      sendMessage: (content: string) => sendChatMessage(content, roomId),
    },
    model,
    phase,
    result,
    refresh,
    loadingFallback,
    leaveRoom,
  };
}









