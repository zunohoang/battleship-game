import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { MissionLogPanel } from '@/components/game-play/MissionLogPanel';
import {
  GamePlayIdentityCard,
  GamePlayShell,
} from '@/components/game-play/GamePlayShell';
import {
  ProfileSetupModal,
  type ProfileSetupPayload,
} from '@/components/modal/ProfileSetupModal';
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
import type { OnlineSetupFlow, RoomStatus } from '@/types/game';

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
    latencyMs,
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
        : (room.guestId ?? room.ownerId)
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
  const showStartSetupButton = !isOwner || hasPhase1Configured;
  const [isProfileSetupOpen, setProfileSetupOpen] = useState(false);
  const [isOpponentProfileOpen, setOpponentProfileOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);

  useEffect(() => {
    if (room?.status === 'closed') {
      leaveRoom();
      navigate('/game/rooms', {
        replace: true,
        state: { roomDismissed: 'host_closed' },
      });
    }
  }, [leaveRoom, navigate, room?.status]);

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

    const totalCells = match.ships.reduce(
      (sum, ship) => sum + ship.size * ship.count,
      0,
    );
    const boardCells = match.boardConfig.rows * match.boardConfig.cols;
    const fleetCellLimit = Math.floor(boardCells * 0.5);
    const totalShipInstances = match.ships.reduce(
      (sum, ship) => sum + ship.count,
      0,
    );

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
  const { getProfileById } = usePlayerProfiles([
    currentUserId,
    opponentUserId,
  ]);
  const currentPlayerProfile = getProfileById(currentUserId);
  const opponentProfile = getProfileById(opponentUserId);

  const currentElo = useMemo(() => {
    const n = currentPlayerProfile?.elo ?? user?.elo;
    if (typeof n === 'number' && Number.isFinite(n)) {
      return n;
    }
    // Matches server default when JWT/context has not refreshed ELO yet.
    return currentUserId ? 800 : null;
  }, [currentPlayerProfile?.elo, currentUserId, user?.elo]);

  const opponentElo = useMemo(() => {
    if (!opponentUserId) {
      return null;
    }
    const n = opponentProfile?.elo;
    return typeof n === 'number' && Number.isFinite(n) ? n : null;
  }, [opponentUserId, opponentProfile?.elo]);

  const currentIdentity = useMemo(
    () => ({
      avatarSrc: currentPlayerProfile?.avatar ?? user?.avatar ?? null,
      label: t('waitingRoom.commander'),
      name:
        currentPlayerProfile?.username?.trim() ||
        user?.username?.trim() ||
        t('waitingRoom.defaultCommanderName'),
      signature:
        currentPlayerProfile?.signature?.trim() ||
        user?.signature?.trim() ||
        '- - -',
      align: 'left' as const,
      elo: currentElo,
      pingMs: latencyMs,
    }),
    [
      currentElo,
      currentPlayerProfile?.avatar,
      currentPlayerProfile?.signature,
      currentPlayerProfile?.username,
      latencyMs,
      t,
      user?.avatar,
      user?.signature,
      user?.username,
    ],
  );
  const opponentIdentity = useMemo(
    () => ({
      avatarSrc: opponentProfile?.avatar ?? null,
      label: opponentUserId
        ? t('waitingRoom.opponent')
        : t('waitingRoom.awaiting'),
      name:
        opponentProfile?.username?.trim() ||
        (opponentUserId ? shortId(opponentUserId) : t('waitingRoom.awaitingPlayer')),
      signature: opponentProfile?.signature?.trim() || '- - -',
      align: 'right' as const,
      elo: opponentElo,
      pingMs: latencyMs,
    }),
    [
      latencyMs,
      opponentElo,
      opponentProfile?.avatar,
      opponentProfile?.signature,
      opponentProfile?.username,
      opponentUserId,
      t,
    ],
  );

  const roomStatusLabel = useMemo(() => {
    const key = (room?.status ?? 'waiting') as RoomStatus;
    return t(`gameRooms.roomStatus.${key}`);
  }, [room?.status, t]);

  const copyRoomCode = useCallback(async () => {
    const code = room?.roomCode?.trim();
    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setRoomCodeCopied(true);
      window.setTimeout(() => {
        setRoomCodeCopied(false);
      }, 2000);
    } catch {
      setRoomCodeCopied(false);
    }
  }, [room?.roomCode]);
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
          elo: opponentElo ?? 800,
        }
        : null,
    [
      opponentIdentity.label,
      opponentProfile?.avatar,
      opponentElo,
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
    [
      currentIdentity.name,
      currentUserId,
      opponentIdentity.name,
      opponentUserId,
      t,
    ],
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
          <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(200px,280px)_minmax(0,1fr)] lg:items-start'>
            <GamePlayIdentityCard
              content={currentIdentity}
              onClick={() => setProfileSetupOpen(true)}
              buttonAriaLabel={t('waitingRoom.editProfileAria')}
            />
            <div className='ui-subpanel min-w-0 rounded-md px-3 py-2 text-center sm:px-4'>
              <p className='ui-title-eyebrow'>{t('waitingRoom.statusLabel')}</p>
              <p className='font-mono text-lg font-black uppercase tracking-[0.16em] text-(--accent-secondary)'>
                {roomStatusLabel}
              </p>
              <div className='mt-2 flex items-center justify-center gap-2'>
                <p className='font-mono text-xs uppercase tracking-[0.18em] text-(--text-subtle)'>
                  {t('waitingRoom.roomPrefix', {
                    code: room?.roomCode ?? '------',
                  })}
                </p>
                <button
                  type='button'
                  onClick={copyRoomCode}
                  disabled={!room?.roomCode}
                  title={
                    roomCodeCopied
                      ? t('waitingRoom.copied')
                      : t('waitingRoom.copyRoomCodeAria')
                  }
                  aria-label={t('waitingRoom.copyRoomCodeAria')}
                  className='inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-[rgba(63,203,232,0.35)] bg-[rgba(7,28,38,0.45)] text-(--accent-secondary) transition-colors hover:bg-[rgba(7,28,38,0.65)] disabled:cursor-not-allowed disabled:opacity-40'
                >
                  {roomCodeCopied ? (
                    <Check size={14} strokeWidth={2.5} />
                  ) : (
                    <Copy size={14} strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
            <GamePlayIdentityCard
              content={opponentIdentity}
              onClick={
                opponentShowcaseProfile
                  ? () => setOpponentProfileOpen(true)
                  : undefined
              }
              buttonAriaLabel={t('waitingRoom.viewOpponentAria')}
            />
          </div>

          <div className='ui-subpanel flex justify-center items-center mt-2 flex-1 min-h-0 overflow-y-auto rounded-sm px-4 py-4'>
            {phase1Summary ? (
              <div className='grid gap-4'>
                <div className='grid gap-3 lg:grid-cols-5'>
                  <div className='ui-subpanel-strong rounded-sm px-4 py-3'>
                    <p className='ui-data-label'>{t('waitingRoom.boardSize')}</p>
                    <p className='mt-2 font-mono text-lg font-black text-(--accent-secondary)'>
                      {phase1Summary.rows}x{phase1Summary.cols}=
                      {phase1Summary.boardCells}
                    </p>
                  </div>

                  <div className='ui-subpanel-strong rounded-sm px-4 py-3'>
                    <p className='ui-data-label'>
                      {t('gameSetup.step1.turnTimer')}
                    </p>
                    <p className='mt-2 font-mono text-lg font-black text-(--text-main)'>
                      {t('gameSetup.step1.turnTimerValue', {
                        seconds: phase1Summary.turnTimerSeconds,
                      })}
                    </p>
                  </div>

                  <div className='ui-subpanel-strong rounded-sm px-4 py-3'>
                    <p className='ui-data-label'>
                      {t('gameSetup.step1.fleetTitle')}
                    </p>
                    <p className='mt-2 font-mono text-lg font-black text-(--text-main)'>
                      {phase1Summary.shipTypes}
                    </p>
                  </div>

                  <div className='ui-subpanel-strong rounded-sm px-4 py-3'>
                    <p className='ui-data-label'>
                      {t('waitingRoom.shipsDeployed')}
                    </p>
                    <p className='mt-2 font-mono text-lg font-black text-(--text-main)'>
                      {phase1Summary.totalShipInstances}
                    </p>
                  </div>

                  <div className='ui-subpanel-strong rounded-sm px-4 py-3'>
                    <p className='ui-data-label'>{t('waitingRoom.boardLoad')}</p>
                    <p className='mt-2 font-mono text-lg font-black text-(--text-main)'>
                      {phase1Summary.totalCells}/{phase1Summary.fleetCellLimit}
                    </p>
                  </div>
                </div>

                { /* For mobile view */ }
                <div className='grid gap-2 md:hidden'>
                  {phase1Summary.ships.map((ship) => (
                    <div
                      key={ship.id}
                      className='ui-state-idle rounded-sm px-4 py-3'
                    >
                      <p className='font-mono text-sm font-black tracking-[0.08em] text-(--text-main)'>
                        {ship.name}
                      </p>
                      <div className='mt-3 grid grid-cols-2 gap-x-3 gap-y-2'>
                        <div>
                          <p className='ui-data-label'>
                            {t('gameSetup.step1.size')}
                          </p>
                          <p className='mt-1 font-mono text-sm font-bold text-(--text-main)'>
                            {ship.size}
                          </p>
                        </div>
                        <div>
                          <p className='ui-data-label'>
                            {t('gameSetup.step1.count')}
                          </p>
                          <p className='mt-1 font-mono text-sm font-bold text-(--text-main)'>
                            {ship.count}
                          </p>
                        </div>
                        <div>
                          <p className='ui-data-label'>{t('waitingRoom.load')}</p>
                          <p className='mt-1 font-mono text-sm font-bold text-(--accent-secondary)'>
                            {ship.size} x {ship.count}
                          </p>
                        </div>
                        <div>
                          <p className='ui-data-label'>{t('waitingRoom.total')}</p>
                          <p className='mt-1 font-mono text-sm font-bold text-(--text-main)'>
                            {ship.size * ship.count}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className='hidden overflow-x-auto pb-1 md:block'>
                  <div className='grid min-w-180 gap-2'>
                    <div className='grid grid-cols-[minmax(0,1.5fr)_120px_140px_100px_115px] gap-3 px-4 py-1'>
                      <p className='ui-data-label'>{t('gameSetup.step1.shipName')}</p>
                      <p className='ui-data-label'>{t('gameSetup.step1.size')}</p>
                      <p className='ui-data-label'>{t('gameSetup.step1.count')}</p>
                      <p className='ui-data-label'>{t('waitingRoom.load')}</p>
                      <p className='ui-data-label'>{t('waitingRoom.total')}</p>
                    </div>

                    <div className='themed-scrollbar max-h-65 overflow-y-auto pr-1'>
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
                {t('waitingRoom.phase1HostNeeded')}
              </p>
            )}
          </div>

          {lastError ? (
            <p className='mt-2 rounded-sm border border-[rgba(220,60,60,0.5)] bg-[rgba(160,30,30,0.2)] px-3 py-2 text-xs text-[rgba(255,170,170,0.95)]'>
              {lastError}
            </p>
          ) : null}

          <div className='ui-panel mt-auto overflow-hidden rounded-md'>
            <MissionLogPanel
              className='px-3 pt-3 pb-2 sm:px-4'
              title={t('waitingRoom.feedTitle')}
              entries={waitingRoomFeed}
              chatMessages={chatMessages}
              currentUserId={currentUserId}
              mode='chat-only'
              isChatDisabled={isChatDisabled}
              showComposer={false}
              logHeightClassName='h-11 sm:h-32'
              resolveChatAuthorLabel={resolveChatAuthorLabel}
            />
            <div className='border-t border-(--border-main) flex w-full min-w-0 flex-col gap-3 px-3 py-2 sm:px-4 lg:flex-row lg:items-start'>
              <div className='flex w-full min-w-0 flex-col gap-2 sm:flex-row lg:w-[50%] lg:max-w-md'>
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
                  maxLength={240}
                  className='ui-input min-w-0 flex-1 basis-0 rounded-sm px-3 py-2 font-mono text-[11px] outline-none transition-colors placeholder:text-(--text-muted) disabled:cursor-not-allowed disabled:opacity-60'
                />
                <button
                  type='button'
                  onClick={handleSendChat}
                  disabled={isChatDisabled || chatDraft.trim().length === 0}
                  className='w-full shrink-0 cursor-pointer rounded-sm border border-[rgba(117,235,255,0.68)] bg-[rgba(117,235,255,0.12)] px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-(--accent-secondary) transition-colors hover:bg-[rgba(117,235,255,0.18)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:self-center'
                >
                  {t('gameBattle.chatSend')}
                </button>
              </div>
              <div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:flex-1'>
                <Button
                  variant='default'
                  className='h-auto! min-h-8! w-full px-3 py-1.5 text-center text-[10px] leading-snug whitespace-normal sm:w-auto sm:max-w-[min(100%,18rem)]'
                  onClick={() => {
                    navigate('/home');
                  }}
                >
                  {t('waitingRoom.backHome')}
                </Button>
                <Button
                  variant='danger'
                  className='h-auto! min-h-8! w-full px-3 py-1.5 text-center text-[10px] leading-snug whitespace-normal sm:w-auto sm:max-w-[min(100%,18rem)]'
                  onClick={() => {
                    leaveRoom();
                    navigate('/game/rooms');
                  }}
                >
                  {t('waitingRoom.leaveRoom')}
                </Button>
                {canConfigurePhase1 ? (
                  <Button
                    variant='primary'
                    className='h-auto! min-h-8! w-full px-3 py-1.5 text-center text-[10px] leading-snug whitespace-normal sm:w-auto sm:max-w-[min(100%,18rem)]'
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
                    {t('waitingRoom.setupPhase1')}
                  </Button>
                ) : null}
                {showStartSetupButton ? (
                  <Button
                    variant='primary'
                    className='h-auto! min-h-8! w-full px-3 py-1.5 text-center text-[10px] leading-snug whitespace-normal sm:w-auto sm:max-w-[min(100%,18rem)]'
                    disabled={!canStartSetup}
                    onClick={() => {
                      if (!room?.roomId) return;
                      startRoom({ roomId: room.roomId });
                    }}
                  >
                    {canStartSetup
                      ? t('waitingRoom.startSetup')
                      : !isOwner
                        ? t('waitingRoom.waitingForOwner')
                        : !room?.guestId
                          ? t('waitingRoom.waitingForOpponent')
                          : t('waitingRoom.setupLocked')}
                  </Button>
                ) : null}
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
        title={t('waitingRoom.opponentProfile')}
        profile={opponentShowcaseProfile}
      />
    </>
  );
}
