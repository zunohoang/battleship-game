import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  GamePlayScreen,
  type GamePlayLoadingFallback,
  type GamePlayScreenModel,
} from '@/pages/game-play';
import { useSpectatorRoom } from '@/hooks/useSpectatorRoom';
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

function formatTurnTimer(deadline: string | null): string {
  if (!deadline) {
    return '--:--';
  }

  const milliseconds = new Date(deadline).getTime() - Date.now();
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutesPart = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secondsPart = String(seconds % 60).padStart(2, '0');
  return `${minutesPart}:${secondsPart}`;
}

export function GameSpectatePage() {
  const navigate = useNavigate();
  const { roomId = '' } = useParams();
  const {
    connectionState,
    room,
    match,
    chatMessages,
    lastError,
  } = useSpectatorRoom(roomId, roomId.length > 0);

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
        message: `${toShortId(shot.by)} ${shot.isHit ? 'hit' : 'miss'} ${String.fromCharCode(65 + shot.x)}${shot.y + 1}`,
        highlight: shot.isHit ? 'critical' : 'miss',
      }));
  }, [match]);

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

    return {
      header: {
        leftContent: {
          avatarSrc: null,
          label: 'PLAYER 1',
          name: toShortId(match.player1Id),
          signature: 'LIVE',
          align: 'left',
        },
        rightContent: {
          avatarSrc: null,
          label: 'PLAYER 2',
          name: toShortId(match.player2Id),
          signature: room?.roomCode ?? '------',
          align: 'right',
        },
        turnKey: match.turnPlayerId ?? 'spectate',
        turnLabel: match.turnPlayerId
          ? `Turn: ${toShortId(match.turnPlayerId)}`
          : 'Spectating',
        turnTone: 'active',
        turnTimerValue: formatTurnTimer(match.turnDeadlineAt),
        turnTimerTone: connectionState === 'connected' ? 'default' : 'muted',
      },
      battlefield: {
        boardConfig: match.boardConfig,
        ships: match.ships,
        shipsById,
        ownPlacements: player1Placements,
        opponentPlacements: player2Placements,
        ownShots: player1Shots,
        incomingShots: player2Shots,
        ownTitle: 'Player 1 Waters',
        opponentTitle: 'Player 2 Waters',
        canFire: false,
        revealOwnShips: revealShips,
        revealOpponentShips: revealShips,
        statsPrimaryTitle: 'PLAYER 1',
        statsSecondaryTitle: 'PLAYER 2',
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
        subtitle: 'Live spectator room',
        heightClassName: 'h-11 sm:h-32',
        chatMessages,
        currentUserId: null,
        chatDisabled: true,
        resolveChatAuthorLabel: (senderId) => toShortId(senderId),
      },
      actions: {
        onQuit: () => navigate('/game/rooms'),
        showEncryptedChannel: true,
        encryptedChannelValue: room?.roomCode ?? '------',
        encryptedChannelMaskable: false,
      },
      state: {
        phase: match.status === 'finished' ? 'gameover' : 'playing',
        result: null,
        onPlayAgain: () => navigate('/game/rooms'),
      },
    };
  }, [chatMessages, connectionState, logEntries, match, navigate, room?.roomCode]);

  return (
    <GamePlayScreen
      key={`spectate:${room?.roomCode ?? roomId}`}
      model={model}
      loadingFallback={loadingFallback}
    />
  );
}
