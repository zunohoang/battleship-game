import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { images } from '@/assets';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import { useOnlineRoom } from '@/hooks/useOnlineRoom';
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
  formatLogTime,
  makeLog,
  toBattleShots,
  toCoordLabel,
} from '@/utils/gamePlayUtils';

const EMPTY_SHIPS: ShipDefinition[] = [];

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
  model: OnlineGamePlayScreenBaseModel | null;
  phase: GamePhase;
  result: GameResult | null;
  refresh: () => void;
  loadingFallback: GamePlayLoadingFallback | null;
}

export function useOnlineGamePlaySession({
  roomId,
  matchId,
  fallbackConfig,
  fallbackPlacements,
  enabled = true,
}: UseOnlineGamePlaySessionParams): UseOnlineGamePlaySessionResult {
  const { t } = useTranslation();
  const { user } = useGlobalContext();
  const currentUserId = user?.id ?? null;

  const { room, match, connectionState, lastError, reconnect, submitMove } =
    useOnlineRoom(roomId, enabled);

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

    if (currentUserId === match.player1Id) {
      return match.player1Placements ?? [];
    }

    if (currentUserId === match.player2Id) {
      return match.player2Placements ?? [];
    }

    return fallbackPlacements ?? [];
  }, [currentUserId, fallbackPlacements, match]);

  const opponentPlacements = useMemo(() => {
    if (!match) {
      return [];
    }

    if (currentUserId === match.player1Id) {
      return match.player2Placements ?? [];
    }

    if (currentUserId === match.player2Id) {
      return match.player1Placements ?? [];
    }

    return [];
  }, [currentUserId, match]);

  const ownShots = useMemo<Shot[]>(() => {
    if (!match) {
      return [];
    }

    if (currentUserId === match.player1Id) {
      return toBattleShots(match.player1Shots);
    }

    if (currentUserId === match.player2Id) {
      return toBattleShots(match.player2Shots);
    }

    return [];
  }, [currentUserId, match]);

  const incomingShots = useMemo<Shot[]>(() => {
    if (!match) {
      return [];
    }

    if (currentUserId === match.player1Id) {
      return toBattleShots(match.player2Shots);
    }

    if (currentUserId === match.player2Id) {
      return toBattleShots(match.player1Shots);
    }

    return [];
  }, [currentUserId, match]);

  const phase: GamePhase =
    enabled && match?.status === 'finished' ? 'gameover' : 'playing';
  const result: GameResult | null =
    enabled && match?.status === 'finished' && match.winnerId
      ? match.winnerId === currentUserId
        ? 'player_wins'
        : 'bot_wins'
      : null;

  const canFire =
    enabled &&
    !!match &&
    phase === 'playing' &&
    connectionState === 'connected' &&
    match.turnPlayerId === currentUserId;

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
      match.status === 'finished' && match.winnerId && currentUserId
        ? {
          id: -(match.version ?? history.length + 1),
          timestamp: formatLogTime(match.updatedAt),
          message: t(
            match.winnerId === currentUserId
              ? 'gameBattle.logEnemyFleetSunk'
              : 'gameBattle.logYourFleetSunk',
          ),
          highlight: 'critical' as const,
        }
        : null;

    return [
      initialLogEntry,
      ...history.map((shot) => {
        const isOwnShot = shot.by === currentUserId;
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
  }, [currentUserId, initialLogEntry, match, t]);

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
        turnTimerValue: '--:--',
        turnTimerTone: 'muted',
        leftContent: {
          avatarSrc: user?.avatar?.trim() || null,
          label: 'COMMANDER',
          name: user?.username?.trim() || 'Bạn',
          signature: user?.signature?.trim() || '- - -',
          align: 'left',
        },
        rightContent: {
          avatarSrc: images.botAvatar,
          label: 'OPPONENT',
          name: 'Đối thủ',
          signature: '- - -',
          align: 'right',
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
    logEntries,
    match,
    opponentPlacements,
    ownPlacements,
    ownShots,
    phase,
    ships,
    shipsById,
    t,
    turnLabel,
    user?.avatar,
    user?.signature,
    user?.username,
  ]);

  return {
    room,
    match,
    model,
    phase,
    result,
    refresh,
    loadingFallback,
  };
}









