import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  GamePlayScreen,
  type GamePlayLoadingFallback,
  type GamePlayScreenModel,
} from '@/pages/game-play';
import { useSpectatorRoom } from '@/hooks/useSpectatorRoom';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import { usePlayerProfiles } from '@/hooks/usePlayerProfiles';
import {
  calculateFleetShipStatuses,
} from '@/utils/gamePlayUtils';
import type { MissionLogEntry, Shot } from '@/types/game';

function toShortId(value: string): string {
  if (!value) {
    return '---';
  }
  return `${value.slice(0, 8)}...`;
}

function toShots(records: Array<{ x: number; y: number; isHit: boolean }>): Shot[] {
  return records.map((record) => ({
    x: record.x,
    y: record.y,
    isHit: record.isHit,
  }));
}

function formatTurnTimer(deadline: string | null, nowMs: number): string {
  if (!deadline) {
    return '--:--';
  }

  const milliseconds = new Date(deadline).getTime() - nowMs;
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutesPart = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secondsPart = String(seconds % 60).padStart(2, '0');
  return `${minutesPart}:${secondsPart}`;
}

export function GameSpectatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roomId = '' } = useParams();
  const { user } = useGlobalContext();
  const {
    connectionState,
    room,
    match,
    chatMessages,
    lastError,
    sendSpectatorMessage,
  } = useSpectatorRoom(roomId, roomId.length > 0);
  const currentUserId = user?.id ?? null;
  const [turnNowMs, setTurnNowMs] = useState(() => Date.now());
  const { getProfileById } = usePlayerProfiles([
    match?.player1Id,
    match?.player2Id,
    currentUserId,
  ]);

  const resolvePlayerName = useCallback(
    (playerId: string | null | undefined): string => {
      if (!playerId) {
        return '---';
      }

      return (
        getProfileById(playerId)?.username?.trim() ||
        (playerId === currentUserId ? user?.username?.trim() : '') ||
        toShortId(playerId)
      );
    },
    [currentUserId, getProfileById, user],
  );

  const resolvePlayerSignature = useCallback(
    (playerId: string | null | undefined): string => {
      if (!playerId) {
        return '- - -';
      }

      return (
        getProfileById(playerId)?.signature?.trim() ||
        (playerId === currentUserId ? user?.signature?.trim() : '') ||
        '- - -'
      );
    },
    [currentUserId, getProfileById, user],
  );

  const resolvePlayerAvatar = useCallback(
    (playerId: string | null | undefined): string | null => {
      if (!playerId) {
        return null;
      }

      return (
        getProfileById(playerId)?.avatar ??
        (playerId === currentUserId ? user?.avatar ?? null : null)
      );
    },
    [currentUserId, getProfileById, user],
  );

  const resolvePlayerElo = useCallback(
    (playerId: string | null | undefined): number => {
      if (!playerId) {
        return 0;
      }

      const profile = getProfileById(playerId);
      if (typeof profile?.elo === 'number' && Number.isFinite(profile.elo)) {
        return profile.elo;
      }

      if (
        playerId === currentUserId &&
        typeof user?.elo === 'number' &&
        Number.isFinite(user.elo)
      ) {
        return user.elo;
      }

      return 0;
    },
    [currentUserId, getProfileById, user],
  );

  useEffect(() => {
    if (!room) {
      return;
    }

    if (room.status === 'in_game' || match?.status === 'finished') {
      return;
    }

    navigate('/game/rooms', { replace: true });
  }, [match?.status, navigate, room]);

  useEffect(() => {
    if (match?.status !== 'in_progress') {
      return;
    }

    const syncNow = () => {
      setTurnNowMs(Date.now());
    };

    const syncTimeoutId = window.setTimeout(syncNow, 0);
    const intervalId = window.setInterval(syncNow, 1000);

    return () => {
      window.clearTimeout(syncTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [match?.status, match?.turnDeadlineAt, match?.turnPlayerId]);

  const logEntries = useMemo<MissionLogEntry[]>(() => {
    if (!match) {
      return [];
    }

    return [...match.player1Shots, ...match.player2Shots]
      .sort((left, right) => {
        const leftAt = new Date(left.at).getTime();
        const rightAt = new Date(right.at).getTime();
        if (leftAt === rightAt) {
          return left.sequence - right.sequence;
        }
        return leftAt - rightAt;
      })
      .map((shot, index) => ({
        id: index + 1,
        timestamp: new Date(shot.at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        message: `${resolvePlayerName(shot.by)} ${shot.isHit ? 'hit' : 'miss'} ${String.fromCharCode(65 + shot.x)}${shot.y + 1}`,
        highlight: shot.isHit ? 'critical' : 'miss',
      }));
  }, [match, resolvePlayerName]);

  const loadingFallback = useMemo<GamePlayLoadingFallback>(
    () => ({
      label: 'SPECTATE',
      title: roomId ? 'Joining live room' : 'Missing room',
      description: roomId
        ? (lastError ?? 'Waiting for the latest live match snapshot.')
        : 'A room id is required to spectate a live match.',
    }),
    [lastError, roomId],
  );

  const model = useMemo<GamePlayScreenModel | null>(() => {
    if (!match) {
      return null;
    }

    const player1Shots = toShots(match.player1Shots);
    const player2Shots = toShots(match.player2Shots);
    const shipsById = new Map(match.ships.map((ship) => [ship.id, ship]));
    const player1Placements = match.player1Placements ?? [];
    const player2Placements = match.player2Placements ?? [];
    const revealShips = match.status === 'finished';
    const player1Name = resolvePlayerName(match.player1Id);
    const player2Name = resolvePlayerName(match.player2Id);
    const activeTurnName = match.turnPlayerId
      ? resolvePlayerName(match.turnPlayerId)
      : t('gameBattle.operation');
    const canSendSpectatorChat =
      connectionState === 'connected' &&
      !!room &&
      room.status === 'in_game' &&
      match.status === 'in_progress';

    return {
      header: {
        leftContent: {
          avatarSrc: resolvePlayerAvatar(match.player1Id),
          label: 'PLAYER 1',
          name: player1Name,
          signature: resolvePlayerSignature(match.player1Id),
          align: 'left',
          elo: resolvePlayerElo(match.player1Id),
        },
        rightContent: {
          avatarSrc: resolvePlayerAvatar(match.player2Id),
          label: 'PLAYER 2',
          name: player2Name,
          signature: resolvePlayerSignature(match.player2Id),
          align: 'right',
          elo: resolvePlayerElo(match.player2Id),
        },
        turnKey: `${match.version}-${match.turnPlayerId ?? 'spectate'}`,
        turnLabel: activeTurnName,
        turnTone: 'active',
        turnTimerValue: connectionState === 'connected' ? formatTurnTimer(match.turnDeadlineAt, turnNowMs) : '--:--',
      },
      battlefield: {
        boardConfig: match.boardConfig,
        ships: match.ships,
        shipsById,
        ownPlacements: player1Placements,
        opponentPlacements: player2Placements,
        ownShots: player1Shots,
        incomingShots: player2Shots,
        ownTitle: t('gameBattle.myFleet'),
        opponentTitle: t('gameBattle.enemyWaters'),
        canFire: false,
        revealOwnShips: revealShips,
        revealOpponentShips: revealShips,
        statsPrimaryTitle: player1Name,
        statsSecondaryTitle: player2Name,
        isBotVBot: false,
        ownFleetStatus: calculateFleetShipStatuses(
          player1Placements,
          shipsById,
          player2Shots,
        ),
        opponentFleetStatus: calculateFleetShipStatuses(
          player2Placements,
          shipsById,
          player1Shots,
        ),
      },
      missionLog: {
        entries: logEntries,
        heightClassName: 'h-11 sm:h-32',
        chatMessages,
        currentUserId,
        onSendChatMessage: canSendSpectatorChat
          ? sendSpectatorMessage
          : undefined,
        resolveChatAuthorLabel: (senderId) =>
          senderId === currentUserId
            ? t('gameBattle.chatYouLabel')
            : resolvePlayerName(senderId),
      },
      actions: {
        onQuit: () => navigate('/game/rooms'),
        showEncryptedChannel: true,
        encryptedChannelValue: room?.roomCode ?? '------',
        encryptedChannelMaskable: true,
        encryptedChannelMaskedValue: '***',
      },
      state: {
        phase: match.status === 'finished' ? 'gameover' : 'playing',
        result: null,
        onPlayAgain: () => navigate('/game/rooms'),
      },
    };
  }, [
    chatMessages,
    connectionState,
    currentUserId,
    logEntries,
    match,
    navigate,
    room,
    resolvePlayerAvatar,
    resolvePlayerElo,
    resolvePlayerName,
    resolvePlayerSignature,
    sendSpectatorMessage,
    t,
    turnNowMs,
  ]);

  return (
    <GamePlayScreen
      key={`spectate:${room?.roomCode ?? roomId}`}
      model={model}
      loadingFallback={loadingFallback}
    />
  );
}
