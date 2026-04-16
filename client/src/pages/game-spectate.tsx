import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crown, ShieldBan, UserRoundX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { BanUserModal } from '@/components/forum/BanUserModal';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  GamePlayScreen,
  type GamePlayLoadingFallback,
  type GamePlayScreenModel,
} from '@/pages/game-play';
import { useSpectatorRoom } from '@/hooks/useSpectatorRoom';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import { usePlayerProfiles } from '@/hooks/usePlayerProfiles';
import {
  banUserInRoom,
  forceWinInRoom,
  kickUserFromRoom,
} from '@/services/adminService';
import { getApiErrorCode } from '@/services/httpError';
import { calculateFleetShipStatuses } from '@/utils/gamePlayUtils';
import type { MissionLogEntry, Shot } from '@/types/game';

function toShortId(value: string): string {
  if (!value) {
    return '---';
  }
  return `${value.slice(0, 8)}...`;
}

function toShots(
  records: Array<{ x: number; y: number; isHit: boolean }>,
): Shot[] {
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

type AdminActionKind = 'force_win' | 'kick';

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
    refresh,
  } = useSpectatorRoom(roomId, roomId.length > 0);
  const currentUserId = user?.id ?? null;
  const [turnNowMs, setTurnNowMs] = useState(() => Date.now());
  const [adminActionState, setAdminActionState] = useState<{
    loading: boolean;
    error: string | null;
    success: string | null;
  }>({ loading: false, error: null, success: null });
  const [adminConfirmState, setAdminConfirmState] = useState<{
    open: boolean;
    action: AdminActionKind | null;
    targetUserId: string | null;
    targetName: string;
    reason: string;
  }>({
    open: false,
    action: null,
    targetUserId: null,
    targetName: '',
    reason: '',
  });
  const [banTarget, setBanTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
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
        (playerId === currentUserId ? (user?.avatar ?? null) : null)
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

  const role = user?.role?.toUpperCase();
  const canModerateInSpectate = role === 'ADMIN' || role === 'MOD';
  const canBanInSpectate = role === 'ADMIN';

  const runAdminAction = useCallback(
    async (action: () => Promise<void>, successMessage: string) => {
      setAdminActionState({ loading: true, error: null, success: null });
      try {
        await action();
        refresh();
        setAdminActionState({
          loading: false,
          error: null,
          success: successMessage,
        });
      } catch (error) {
        setAdminActionState({
          loading: false,
          error: getApiErrorCode(error),
          success: null,
        });
      }
    },
    [refresh],
  );

  const openAdminConfirm = useCallback(
    (action: AdminActionKind, targetUserId: string) => {
      const defaultReason =
        action === 'force_win'
          ? t('adminSpectate.defaultReasonForceWin')
          : t('adminSpectate.defaultReasonKick');
      setAdminConfirmState({
        open: true,
        action,
        targetUserId,
        targetName: resolvePlayerName(targetUserId),
        reason: defaultReason,
      });
    },
    [resolvePlayerName, t],
  );

  const closeAdminConfirm = useCallback(() => {
    if (adminActionState.loading) {
      return;
    }
    setAdminConfirmState({
      open: false,
      action: null,
      targetUserId: null,
      targetName: '',
      reason: '',
    });
  }, [adminActionState.loading]);

  const submitAdminConfirm = useCallback(async () => {
    if (
      !room ||
      !adminConfirmState.action ||
      !adminConfirmState.targetUserId ||
      !adminConfirmState.reason.trim()
    ) {
      return;
    }

    const reason = adminConfirmState.reason.trim();
    const targetUserId = adminConfirmState.targetUserId;
    const targetName = adminConfirmState.targetName;

    if (adminConfirmState.action === 'force_win') {
      await runAdminAction(
        () => forceWinInRoom(room.roomId, targetUserId, reason),
        t('adminSpectate.successForceWin', { name: targetName }),
      );
    } else if (adminConfirmState.action === 'kick') {
      await runAdminAction(
        () => kickUserFromRoom(room.roomId, targetUserId, reason),
        t('adminSpectate.successKick', { name: targetName }),
      );
    }

    setAdminConfirmState({
      open: false,
      action: null,
      targetUserId: null,
      targetName: '',
      reason: '',
    });
  }, [adminConfirmState, room, runAdminAction, t]);

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
    const buildAdminActions = (playerId: string) => {
      if (!canModerateInSpectate || !room) {
        return undefined;
      }

      const baseActions = [
        {
          key: `force-win-${playerId}`,
          label: t('adminSpectate.forceWin'),
          icon: <Crown size={14} />,
          disabled: adminActionState.loading,
          onClick: () => openAdminConfirm('force_win', playerId),
        },
        {
          key: `kick-${playerId}`,
          label: t('adminSpectate.kickUser'),
          icon: <UserRoundX size={14} />,
          disabled: adminActionState.loading,
          onClick: () => openAdminConfirm('kick', playerId),
        },
      ];

      if (!canBanInSpectate) {
        return baseActions;
      }

      return [
        ...baseActions,
        {
          key: `ban-${playerId}`,
          label: t('adminSpectate.banUser'),
          icon: <ShieldBan size={14} />,
          tone: 'danger' as const,
          disabled: adminActionState.loading,
          onClick: () =>
            setBanTarget({
              id: playerId,
              name: resolvePlayerName(playerId),
            }),
        },
      ];
    };

    return {
      header: {
        leftContent: {
          avatarSrc: resolvePlayerAvatar(match.player1Id),
          label: 'PLAYER 1',
          name: player1Name,
          signature: resolvePlayerSignature(match.player1Id),
          align: 'left',
          elo: resolvePlayerElo(match.player1Id),
          adminActions: buildAdminActions(match.player1Id),
        },
        rightContent: {
          avatarSrc: resolvePlayerAvatar(match.player2Id),
          label: 'PLAYER 2',
          name: player2Name,
          signature: resolvePlayerSignature(match.player2Id),
          align: 'right',
          elo: resolvePlayerElo(match.player2Id),
          adminActions: buildAdminActions(match.player2Id),
        },
        turnKey: `${match.version}-${match.turnPlayerId ?? 'spectate'}`,
        turnLabel: activeTurnName,
        turnTone: 'active',
        turnTimerValue:
          connectionState === 'connected'
            ? formatTurnTimer(match.turnDeadlineAt, turnNowMs)
            : '--:--',
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
    adminActionState.loading,
    chatMessages,
    connectionState,
    currentUserId,
    canBanInSpectate,
    canModerateInSpectate,
    logEntries,
    match,
    navigate,
    room,
    openAdminConfirm,
    resolvePlayerAvatar,
    resolvePlayerElo,
    resolvePlayerName,
    resolvePlayerSignature,
    sendSpectatorMessage,
    t,
    turnNowMs,
  ]);

  return (
    <>
      <GamePlayScreen
        key={`spectate:${room?.roomCode ?? roomId}`}
        model={model}
        loadingFallback={loadingFallback}
      />
      {(adminActionState.error || adminActionState.success) && canModerateInSpectate ? (
        <section className='ui-panel fixed right-3 bottom-3 z-120 w-[320px] rounded-md p-3'>
          {adminActionState.error ? (
            <p className='text-xs font-semibold text-(--accent-danger)'>
              {adminActionState.error}
            </p>
          ) : (
            <p className='text-xs font-semibold text-(--accent-success)'>
              {adminActionState.success}
            </p>
          )}
        </section>
      ) : null}
      <Modal
        isOpen={adminConfirmState.open}
        title={t('adminSpectate.confirmTitle')}
        onClose={closeAdminConfirm}
      >
        <div className='space-y-3'>
          <p className='text-sm text-(--text-muted)'>
            {t('adminSpectate.targetLabel')}:{' '}
            <span className='font-semibold text-(--text-main)'>{adminConfirmState.targetName}</span>
          </p>
          <p className='text-xs text-(--text-subtle)'>
            {t('adminSpectate.actionLabel')}:{' '}
            <span className='font-semibold uppercase tracking-[0.08em] text-(--text-main)'>
              {adminConfirmState.action ?? '-'}
            </span>
          </p>
          <label className='grid gap-1 text-xs text-(--text-muted)'>
            {t('adminSpectate.reasonLabel')}
            <textarea
              className='ui-input min-h-24 rounded-sm px-3 py-2'
              value={adminConfirmState.reason}
              onChange={(event) =>
                setAdminConfirmState((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
              placeholder={t('adminSpectate.reasonPlaceholder')}
              disabled={adminActionState.loading}
            />
          </label>
          <div className='flex justify-end gap-2'>
            <Button
              variant='default'
              className='h-9 w-auto px-3'
              onClick={closeAdminConfirm}
              disabled={adminActionState.loading}
            >
              {t('adminSpectate.cancel')}
            </Button>
            <Button
              variant='danger'
              className='h-9 w-auto px-3'
              onClick={() => void submitAdminConfirm()}
              disabled={
                adminActionState.loading || !adminConfirmState.reason.trim()
              }
            >
              {t('adminSpectate.confirm')}
            </Button>
          </div>
        </div>
      </Modal>
      <BanUserModal
        isOpen={banTarget !== null}
        username={banTarget?.name ?? null}
        isSubmitting={adminActionState.loading}
        onClose={() => {
          if (adminActionState.loading) {
            return;
          }
          setBanTarget(null);
        }}
        onSubmit={async (payload) => {
          if (!banTarget || !room) {
            return;
          }
          await runAdminAction(
            () => banUserInRoom(room.roomId, banTarget.id, payload),
            t('adminSpectate.successBan', { name: banTarget.name }),
          );
          setBanTarget(null);
        }}
      />
    </>
  );
}
