import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { MissionLogPanel } from '@/components/game-play/MissionLogPanel';
import {
  GamePlayIdentityCard,
  GamePlayShell,
} from '@/components/game-play/GamePlayShell';
import { ProfileSetupModal, type ProfileSetupPayload } from '@/components/modal/ProfileSetupModal';
import { ProfileShowcaseModal } from '@/components/modal/ProfileShowcaseModal';
import { Button } from '@/components/ui/Button';
import { useOnlineRoom } from '@/hooks/useOnlineRoom';
import { usePlayerProfiles } from '@/hooks/usePlayerProfiles';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import * as authService from '@/services/authService';
import {
  getApiErrorCode,
  isGloballyHandledApiError,
} from '@/services/httpError';
import type { OnlineSetupFlow } from '@/types/game';

type WaitingLocationState = {
  roomId?: string;
  matchId?: string;
};

function shortId(value: string | null | undefined): string {
  if (!value) return '---';
  return `${value.slice(0, 8)}...`;
}

export function WaitingRoomPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, setUser, logout } = useGlobalContext();
  const state = (location.state as WaitingLocationState | null) ?? {};
  const roomId = state.roomId;
  const matchId = state.matchId;
  const {
    connectionState,
    room,
    match,
    chatMessages,
    lastError,
    startRoom,
    reconnect,
    leaveRoom,
    sendChatMessage,
  } = useOnlineRoom(roomId);

  const currentUserId = user?.id ?? null;
  const isOwner = !!currentUserId && currentUserId === room?.ownerId;
  const opponentUserId = room
    ? currentUserId === room.ownerId
      ? room.guestId
      : currentUserId === room.guestId
        ? room.ownerId
        : room.guestId ?? room.ownerId
    : null;
  const hasPhase1Configured = !!room?.currentMatchId;
  const canConfigurePhase1 =
    !!isOwner && room?.status === 'waiting' && !room.currentMatchId;
  const canStartSetup =
    !!isOwner &&
    !!room?.guestId &&
    room.status === 'waiting' &&
    hasPhase1Configured &&
    !!match;
  const [isProfileSetupOpen, setProfileSetupOpen] = useState(false);
  const [isOpponentProfileOpen, setOpponentProfileOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/home');
      return;
    }

    if (!roomId && !matchId) {
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
  }, [isLoggedIn, matchId, navigate, reconnect, roomId]);

  useEffect(() => {
    if (!room || !match) {
      return;
    }

    if (room.status === 'setup') {
      const onlineSetupFlow: OnlineSetupFlow = 'placement';
      navigate('/game/setup', {
        state: {
          mode: 'online',
          roomId: room.roomId,
          matchId: match.id,
          onlineSetupFlow,
        },
      });
    }
  }, [match, navigate, room]);

  useEffect(() => {
    if (opponentUserId) {
      return;
    }

    setOpponentProfileOpen(false);
  }, [opponentUserId]);

  const phase1Summary = useMemo(() => {
    if (!match) {
      return null;
    }

    const totalCells = match.ships.reduce((sum, ship) => sum + ship.size * ship.count, 0);
    const boardCells = match.boardConfig.rows * match.boardConfig.cols;
    const fleetCellLimit = Math.floor(boardCells * 0.5);
    const totalShipInstances = match.ships.reduce((sum, ship) => sum + ship.count, 0);

    return {
      rows: match.boardConfig.rows,
      cols: match.boardConfig.cols,
      boardCells,
      fleetCellLimit,
      shipTypes: match.ships.length,
      totalShipInstances,
      totalCells,
      ships: match.ships,
      turnTimerSeconds: match.turnTimerSeconds,
    };
  }, [match]);

  const waitingRoomFeed = useMemo(() => [], []);
  const { getProfileById, refreshProfiles } = usePlayerProfiles([currentUserId, opponentUserId]);
  const currentPlayerProfile = getProfileById(currentUserId);
  const opponentProfile = getProfileById(opponentUserId);
  const currentIdentity = useMemo(
    () => ({
      avatarSrc: currentPlayerProfile?.avatar ?? user?.avatar ?? null,
      label: 'COMMANDER',
      name:
        currentPlayerProfile?.username?.trim() ||
        user?.username?.trim() ||
        'Commander',
      signature:
        currentPlayerProfile?.signature?.trim() ||
        user?.signature?.trim() ||
        '- - -',
      align: 'left' as const,
    }),
    [
      currentPlayerProfile?.avatar,
      currentPlayerProfile?.signature,
      currentPlayerProfile?.username,
      user?.avatar,
      user?.signature,
      user?.username,
    ],
  );
  const opponentIdentity = useMemo(
    () => ({
      avatarSrc: opponentProfile?.avatar ?? null,
      label: opponentUserId ? 'OPPONENT' : 'AWAITING',
      name:
        opponentProfile?.username?.trim() ||
        (opponentUserId ? shortId(opponentUserId) : 'Awaiting Player'),
      signature: opponentProfile?.signature?.trim() || '- - -',
      align: 'right' as const,
    }),
    [
      opponentProfile?.avatar,
      opponentProfile?.signature,
      opponentProfile?.username,
      opponentUserId,
    ],
  );
  const profileSetupModalKey = [
    'waiting-room-profile-setup',
    isProfileSetupOpen ? 'open' : 'closed',
    user?.username ?? '',
    user?.signature ?? '',
    user?.avatar ?? '',
  ].join(':');
  const opponentShowcaseProfile = useMemo(
    () =>
      opponentUserId
        ? {
          id: opponentUserId,
          username:
            opponentProfile?.username?.trim() || shortId(opponentUserId),
          avatar: opponentProfile?.avatar ?? null,
          signature: opponentProfile?.signature?.trim() || '- - -',
          label: opponentIdentity.label,
        }
        : null,
    [
      opponentIdentity.label,
      opponentProfile?.avatar,
      opponentProfile?.signature,
      opponentProfile?.username,
      opponentUserId,
    ],
  );

  const handleSubmitProfileSetup = async (
    payload: ProfileSetupPayload,
  ): Promise<string | null> => {
    try {
      const response = await authService.updateProfile({
        username: payload.username,
        signature: payload.signature,
        avatarFile: payload.avatarFile,
      });

      setUser({
        id: response.user.id,
        username: response.user.username,
        avatar: response.user.avatar,
        signature: response.user.signature,
        elo: response.user.elo,
        isAnonymous: false,
      });
      setProfileSetupOpen(false);

      return null;
    } catch (error) {
      if (isGloballyHandledApiError(error)) {
        return null;
      }

      return t(`errors.${getApiErrorCode(error)}`);
    }
  };

  const handleProfileLogout = async (): Promise<void> => {
    leaveRoom();

    try {
      await authService.logout();
    } finally {
      logout();
      setProfileSetupOpen(false);
      navigate('/home');
    }
  };

  const handleRefreshState = async () => {
    reconnect({ roomId, matchId });

    const refreshedProfiles = await refreshProfiles();
    const refreshedCurrentProfile =
      currentUserId ? refreshedProfiles[currentUserId] ?? null : null;

    if (refreshedCurrentProfile && user) {
      setUser({
        ...user,
        username: refreshedCurrentProfile.username,
        avatar: refreshedCurrentProfile.avatar,
        signature: refreshedCurrentProfile.signature,
        elo: refreshedCurrentProfile.elo,
      });
    }
  };

  const resolveChatAuthorLabel = useCallback(
    (senderId: string) => {
      if (senderId === currentUserId) {
        return currentIdentity.name;
      }

      if (senderId === opponentUserId) {
        return opponentIdentity.name;
      }

      return t('gameBattle.chatOpponentLabel');
    },
    [currentIdentity.name, currentUserId, opponentIdentity.name, opponentUserId, t],
  );

  const isChatDisabled = connectionState !== 'connected' || !room;

  const handleSendChat = () => {
    const content = chatDraft.trim();
    if (!content || isChatDisabled) {
      return;
    }

    sendChatMessage(content, room?.roomId);
    setChatDraft('');
  };

  return (
    <>
      <GamePlayShell sectionClassName='ui-hud-shell mx-auto flex min-h-full w-full max-w-5xl flex-col rounded-md p-2 sm:p-4'>
        <div className='flex min-h-0 flex-1 flex-col gap-3'>
          <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)] lg:items-center'>
            <GamePlayIdentityCard
              content={currentIdentity}
              onClick={() => setProfileSetupOpen(true)}
              buttonAriaLabel='Edit your profile'
            />
            <div className='ui-subpanel rounded-md px-4 py-2 text-center'>
              <p className='ui-title-eyebrow'>Status</p>
              <p className='font-mono text-lg font-black uppercase tracking-[0.16em] text-(--accent-secondary)'>
                {room?.status ?? 'waiting'}
              </p>
              <p className='mt-2 font-mono text-xs uppercase tracking-[0.18em] text-(--text-subtle)'>
                Room {room?.roomCode ?? '------'}
              </p>
            </div>
            <GamePlayIdentityCard
              content={opponentIdentity}
              onClick={
                opponentShowcaseProfile
                  ? () => setOpponentProfileOpen(true)
                  : undefined
              }
              buttonAriaLabel='View opponent profile'
            />
          </div>

          <div className='ui-subpanel mt-2 rounded-sm px-4 py-4'>
            {phase1Summary ? (
              <div className='grid gap-4'>
                <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
                  <div className='ui-subpanel-strong rounded-sm px-4 py-3'>
                    <p className='ui-data-label'>Board Size</p>
                    <p className='mt-2 font-mono text-lg font-black text-(--accent-secondary)'>
                      {phase1Summary.rows}x{phase1Summary.cols}={phase1Summary.boardCells}
                    </p>
                  </div>

                  <div className='ui-subpanel-strong rounded-sm px-4 py-3'>
                    <p className='ui-data-label'>{t('gameSetup.step1.turnTimer')}</p>
                    <p className='mt-2 font-mono text-lg font-black text-(--text-main)'>
                      {t('gameSetup.step1.turnTimerValue', {
                        seconds: phase1Summary.turnTimerSeconds,
                      })}
                    </p>
                  </div>

                  <div className='ui-subpanel-strong rounded-sm px-4 py-3'>
                    <p className='ui-data-label'>{t('gameSetup.step1.fleetTitle')}</p>
                    <p className='mt-2 font-mono text-lg font-black text-(--text-main)'>
                      {phase1Summary.shipTypes}
                    </p>
                  </div>

                  <div className='ui-subpanel-strong rounded-sm px-4 py-3'>
                    <p className='ui-data-label'>Ships Deployed</p>
                    <p className='mt-2 font-mono text-lg font-black text-(--text-main)'>
                      {phase1Summary.totalShipInstances}
                    </p>
                  </div>

                  <div className='ui-subpanel-strong rounded-sm px-4 py-3'>
                    <p className='ui-data-label'>Board Load</p>
                    <p className='mt-2 font-mono text-lg font-black text-(--text-main)'>
                      {phase1Summary.totalCells}/{phase1Summary.fleetCellLimit}
                    </p>
                  </div>
                </div>

                <div className='overflow-x-auto pb-1'>
                  <div className='min-w-[720px] grid gap-2'>
                    <div className='grid grid-cols-[minmax(0,1.5fr)_110px_110px_120px_90px] gap-3 px-4 py-1'>
                      <p className='ui-data-label'>{t('gameSetup.step1.shipName')}</p>
                      <p className='ui-data-label'>{t('gameSetup.step1.size')}</p>
                      <p className='ui-data-label'>{t('gameSetup.step1.count')}</p>
                      <p className='ui-data-label'>Load</p>
                      <p className='ui-data-label'>Tổng</p>
                    </div>

                    <div className='themed-scrollbar max-h-[18rem] overflow-y-auto pr-1'>
                      <div className='grid gap-2'>
                        {phase1Summary.ships.map((ship) => (
                          <div
                            key={ship.id}
                            className='ui-state-idle rounded-sm px-4 py-3'
                          >
                            <div className='grid grid-cols-[minmax(0,1.5fr)_110px_110px_120px_90px] items-center gap-3'>
                              <p className='truncate font-mono text-sm font-black tracking-[0.08em] text-(--text-main)'>
                                {ship.name}
                              </p>
                              <p className='font-mono text-sm font-bold text-(--text-main)'>
                                {ship.size}
                              </p>
                              <p className='font-mono text-sm font-bold text-(--text-main)'>
                                {ship.count}
                              </p>
                              <p className='font-mono text-sm font-bold text-(--accent-secondary)'>
                                {ship.size} x {ship.count}
                              </p>
                              <p className='font-mono text-sm font-bold text-(--text-main)'>
                                {ship.size * ship.count}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className='mt-2 text-sm text-(--text-muted)'>
                The host still needs to configure phase 1 before this room can accept an opponent.
              </p>
            )}
          </div>

          {lastError ? (
            <p className='mt-2 rounded-sm border border-[rgba(220,60,60,0.5)] bg-[rgba(160,30,30,0.2)] px-3 py-2 text-xs text-[rgba(255,170,170,0.95)]'>
              {lastError}
            </p>
          ) : null}

          <div className='ui-panel overflow-hidden rounded-md'>
            <MissionLogPanel
              className='px-3 pt-3 pb-2 sm:px-4'
              title='WAITING ROOM FEED'
              entries={waitingRoomFeed}
              chatMessages={chatMessages}
              currentUserId={currentUserId}
              mode='chat-only'
              isChatDisabled={isChatDisabled}
              showComposer={false}
              logHeightClassName='h-11 sm:h-32'
              resolveChatAuthorLabel={resolveChatAuthorLabel}
            />
            <div className='border-t border-(--border-main) flex flex-col gap-2 px-3 py-2 sm:px-4 md:flex-row md:items-center md:justify-between'>
              <div className='flex flex-wrap items-center gap-2'>
                <div className='flex min-w-0 items-center gap-2 md:mr-2 md:flex-1'>
                  <button
                    type='button'
                    onClick={handleSendChat}
                    disabled={isChatDisabled || chatDraft.trim().length === 0}
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
                    disabled={isChatDisabled}
                    maxLength={280}
                    className='w-64 flex-1 rounded-sm border border-(--border-main) bg-[rgba(4,12,20,0.8)] px-3 py-2 font-mono text-[11px] text-(--text-main) outline-none transition-colors placeholder:text-(--text-muted) focus:border-[rgba(117,235,255,0.72)] disabled:cursor-not-allowed disabled:opacity-60'
                  />
                </div>
                <Button
                  className='h-8 px-3 text-[10px] md:w-auto'
                  onClick={() => navigate('/home')}
                >
                  Back Home
                </Button>
                <Button
                  variant='danger'
                  className='h-8 px-3 text-[10px] md:w-auto'
                  onClick={() => {
                    leaveRoom();
                    navigate('/game/rooms');
                  }}
                >
                  Leave Room
                </Button>
                <Button
                  className='h-8 px-3 text-[10px] md:w-auto'
                  onClick={() => {
                    void handleRefreshState();
                  }}
                >
                  Refresh State
                </Button>
                {isOwner ? (
                  <Button
                    variant='primary'
                    className='h-8 px-3 text-[10px] md:w-auto'
                    disabled={!canConfigurePhase1}
                    onClick={() => {
                      const onlineSetupFlow: OnlineSetupFlow = 'phase1';
                      navigate('/game/setup', {
                        state: {
                          mode: 'online',
                          roomId: room?.roomId ?? roomId,
                          matchId: match?.id ?? matchId,
                          onlineSetupFlow,
                        },
                      });
                    }}
                  >
                    {canConfigurePhase1 ? 'Setup Phase 1' : 'Phase 1 Locked'}
                  </Button>
                ) : null}
                <Button
                  variant='primary'
                  className='h-8 px-3 text-[10px] md:w-auto'
                  disabled={!canStartSetup}
                  onClick={() => {
                    if (!room?.roomId) return;
                    startRoom({ roomId: room.roomId });
                  }}
                >
                  {canStartSetup
                    ? 'Start Setup'
                    : !isOwner
                      ? 'Waiting For Owner'
                      : !hasPhase1Configured
                        ? 'Finish Phase 1 First'
                        : !room?.guestId
                          ? 'Waiting For Opponent'
                          : 'Setup Locked'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </GamePlayShell>

      <ProfileSetupModal
        key={profileSetupModalKey}
        isOpen={isProfileSetupOpen}
        onClose={() => setProfileSetupOpen(false)}
        onSubmit={handleSubmitProfileSetup}
        onLogout={handleProfileLogout}
        onUserUpdated={(updated) => {
          setUser({
            id: updated.id,
            username: updated.username,
            avatar: updated.avatar,
            signature: updated.signature,
            elo: updated.elo,
            isAnonymous: false,
          });
        }}
        username={user?.username ?? ''}
        signature={user?.signature}
        avatar={user?.avatar}
      />

      <ProfileShowcaseModal
        isOpen={isOpponentProfileOpen}
        onClose={() => setOpponentProfileOpen(false)}
        title='Opponent Profile'
        profile={opponentShowcaseProfile}
      />
    </>
  );
}
