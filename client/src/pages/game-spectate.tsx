import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { BattleBoardPanel } from '@/components/game-play/GamePlayBattlefield';
import { MissionLogPanel } from '@/components/game-play/MissionLogPanel';
import {
  GamePlayIdentityCard,
  GamePlayShell,
  GamePlayTurnStatus,
} from '@/components/game-play/GamePlayShell';
import { useSpectatorRoom } from '@/hooks/useSpectatorRoom';
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
    sendSpectatorMessage,
  } = useSpectatorRoom(roomId, roomId.length > 0);

  const battleData = useMemo(() => {
    if (!match) {
      return null;
    }

    const player1Shots = toShots(match.player1Shots);
    const player2Shots = toShots(match.player2Shots);

    return {
      boardConfig: match.boardConfig,
      ships: match.ships,
      player1: {
        id: match.player1Id,
        placements: match.player1Placements ?? [],
        incomingShots: player2Shots,
      },
      player2: {
        id: match.player2Id,
        placements: match.player2Placements ?? [],
        incomingShots: player1Shots,
      },
      turnPlayerId: match.turnPlayerId,
      turnTimerValue: formatTurnTimer(match.turnDeadlineAt),
      revealShips: match.status === 'finished',
    };
  }, [match]);

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

  return (
    <GamePlayShell sectionClassName='ui-hud-shell mx-auto flex min-h-full w-full max-w-7xl flex-col gap-3 rounded-md p-3 sm:p-4'>
      <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center'>
        <GamePlayIdentityCard
          content={{
            avatarSrc: null,
            label: 'PLAYER 1',
            name: battleData ? toShortId(battleData.player1.id) : 'Waiting',
            signature: 'Live',
            align: 'left',
          }}
        />

        <GamePlayTurnStatus
          turnKey={battleData?.turnPlayerId ?? 'spectate'}
          turnLabel={
            battleData?.turnPlayerId
              ? `Turn: ${toShortId(battleData.turnPlayerId)}`
              : 'Spectating'
          }
          turnTone='active'
          turnTimerValue={battleData?.turnTimerValue ?? '--:--'}
          turnTimerTone={connectionState === 'connected' ? 'default' : 'muted'}
        />

        <GamePlayIdentityCard
          content={{
            avatarSrc: null,
            label: 'PLAYER 2',
            name: battleData ? toShortId(battleData.player2.id) : 'Waiting',
            signature: room?.roomCode ?? '------',
            align: 'right',
          }}
        />
      </div>

      <div className='grid min-h-0 flex-1 gap-3 lg:grid-cols-2'>
        {battleData ? (
          <>
            <BattleBoardPanel
              tone='friendly'
              title='Player 1 Waters'
              boardProps={{
                boardConfig: battleData.boardConfig,
                ships: battleData.ships,
                placements: battleData.player1.placements,
                shots: battleData.player1.incomingShots,
                revealShips: battleData.revealShips,
              }}
            />
            <BattleBoardPanel
              tone='hostile'
              title='Player 2 Waters'
              boardProps={{
                boardConfig: battleData.boardConfig,
                ships: battleData.ships,
                placements: battleData.player2.placements,
                shots: battleData.player2.incomingShots,
                revealShips: battleData.revealShips,
              }}
            />
          </>
        ) : (
          <div className='ui-panel col-span-full rounded-md p-6 text-sm text-(--text-muted)'>
            Waiting for live match snapshot...
          </div>
        )}
      </div>

      <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]'>
        <div className='ui-panel rounded-md p-3'>
          <MissionLogPanel
            title='Mission Feed'
            subtitle='Live spectator room'
            entries={logEntries}
            chatMessages={chatMessages}
            isChatDisabled={connectionState !== 'connected'}
            onSendMessage={(content) => sendSpectatorMessage(content)}
            resolveChatAuthorLabel={(senderId) => toShortId(senderId)}
          />
        </div>

        <div className='ui-panel rounded-md p-3'>
          <p className='ui-data-label'>Inspector</p>
          <p className='mt-2 text-xs text-(--text-muted)'>
            You are watching a public live match in read-only mode.
          </p>
          {lastError ? (
            <p className='mt-3 rounded-sm border border-[rgba(220,60,60,0.5)] bg-[rgba(160,30,30,0.2)] px-3 py-2 text-xs text-[rgba(255,170,170,0.95)]'>
              {lastError}
            </p>
          ) : null}
          <Button className='mt-4 h-10 w-full' onClick={() => navigate('/game/rooms')}>
            Exit Spectate
          </Button>
        </div>
      </div>
    </GamePlayShell>
  );
}
