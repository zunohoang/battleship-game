import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { DEFAULT_GAME_CONFIG } from '@/constants/gameDefaults';
import { buildRandomPlacements, buildShipInstances } from '@/utils/placementUtils';
import {
  Button,
  SectionStatus,
  ForgotPasswordModal,
  LoginModal,
  RegisterModal,
  ProfileSetupModal,
  SettingsModal,
} from '@/components';
import type { ProfileSetupPayload } from '@/components/modal/ProfileSetupModal';
import { useModalState } from '@/hooks/useModalState';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import * as authService from '@/services/authService';
import {
  getApiErrorCode,
  isGloballyHandledApiError,
} from '@/services/httpError';
import {
  validateLoginInput,
  validateRegisterInput,
} from '@/utils/authValidation';

type AuthModalMode =
  | 'login'
  | 'register'
  | 'forgotPassword'
  | 'profileSetup'
  | 'settings';

type HomeNavigationState = {
  openProfileSetup?: boolean;
};

const pageTransition = { duration: 0.52, ease: [0.16, 1, 0.3, 1] } as const;

const staggerParent = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
};

const revealItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: pageTransition,
  },
};

export function HomePage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const currentYear = new Date().getFullYear();
  const { user, setUser, logout } = useGlobalContext();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const {
    modalMode: authModalMode,
    isModalOpen,
    openModal,
    closeModal,
  } = useModalState<AuthModalMode>();
  const navigationState = useMemo(
    () => (location.state as HomeNavigationState | null) ?? null,
    [location.state],
  );

  useEffect(() => {
    if (!navigationState?.openProfileSetup) {
      return;
    }

    openModal('profileSetup');
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
  }, [
    location.pathname,
    location.search,
    navigate,
    navigationState,
    openModal,
  ]);

  const handleSubmitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    const formData = new FormData(event.currentTarget);
    const rawEmail = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const { email, errorCode } = validateLoginInput(rawEmail, password);

    if (errorCode) {
      setLoginError(t(`errors.${errorCode}`));
      return;
    }

    try {
      const response = await authService.login({
        email,
        password,
      });

      setUser({
        username: response.user.username,
        avatar: response.user.avatar,
        signature: response.user.signature,
        isAnonymous: false,
      });

      closeModal();
    } catch (error) {
      if (isGloballyHandledApiError(error)) {
        return;
      }
      setLoginError(t(`errors.${getApiErrorCode(error)}`));
    }
  };

  const handleSubmitRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegisterError(null);
    const formData = new FormData(event.currentTarget);
    const rawUsername = String(formData.get('username') ?? '');
    const rawEmail = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');
    const { username, email, errorCode } = validateRegisterInput(
      rawUsername,
      rawEmail,
      password,
      confirmPassword,
    );

    if (errorCode) {
      setRegisterError(t(`errors.${errorCode}`));
      return;
    }

    try {
      const response = await authService.register({
        username,
        email,
        password,
      });

      setUser({
        username: response.user.username,
        avatar: response.user.avatar,
        signature: null,
        isAnonymous: false,
      });

      openModal('profileSetup');
    } catch (error) {
      if (isGloballyHandledApiError(error)) {
        return;
      }
      setRegisterError(t(`errors.${getApiErrorCode(error)}`));
    }
  };

  const handleSubmitProfileSetup = async (
    payload: ProfileSetupPayload,
  ): Promise<string | null> => {
    try {
      const response = await authService.updateProfile({
        username: payload.username,
        signature: payload.signature,
        password: payload.password,
        avatarFile: payload.avatarFile,
      });

      setUser({
        username: response.user.username,
        avatar: response.user.avatar,
        signature: response.user.signature,
        isAnonymous: false,
      });
      closeModal();

      return null;
    } catch (error) {
      if (isGloballyHandledApiError(error)) {
        return null;
      }
      return t(`errors.${getApiErrorCode(error)}`);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await authService.logout();
    } finally {
      logout();
      closeModal();
      navigate('/home');
    }
  };

  const handleSubmitForgotPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const isAnonymous = user?.isAnonymous ?? true;
  const isProfileSetupOpen = isModalOpen && authModalMode === 'profileSetup';
  const profileSetupModalKey = [
    'profileSetup',
    isProfileSetupOpen ? 'open' : 'closed',
    user?.username ?? '',
    user?.signature ?? '',
    user?.avatar ?? '',
  ].join(':');

  const menuItems = [
    {
      id: 'playOnline',
      label: t('home.menu.playOnline'),
      disabled: isAnonymous,
    },
    {
      id: 'playBot',
      label: t('home.menu.playBot'),
      disabled: false,
    },

    {
      id: 'botVsBot',
      label: t('home.menu.botVsBot'),
      disabled: false,
    },
    {
      id: 'settings',
      label: t('home.menu.settings'),
      disabled: false,
    },
  ];

  const gameModeMap: Record<string, string> = {
    playOnline: 'online',
    playBot: 'bot',
    botVsBot: 'botvbot',
  };

  const handleGameMode = (id: string) => {
    if (id === 'settings') {
      openModal('settings');
      return;
    }

    if (id === 'playOnline') {
      navigate('/game/rooms');
      return;
    }

    if (id === 'botVsBot') {
      const { boardConfig, ships } = DEFAULT_GAME_CONFIG;
      const instances = buildShipInstances(ships);
      const sbMap = new Map(ships.map((s) => [s.id, s]));
      const placementsA = buildRandomPlacements(instances, boardConfig, sbMap) ?? [];
      const placementsB = buildRandomPlacements(instances, boardConfig, sbMap) ?? [];
      navigate('/game/play', {
        state: {
          mode: 'botvbot',
          config: DEFAULT_GAME_CONFIG,
          placements: placementsA,
          botPlacements: placementsB,
        },
      });
      return;
    }

    const mode = gameModeMap[id];
    if (mode) {
      navigate('/game/setup', { state: { mode } });
    }
  };

  const tacticalStats = [
    {
      label: t('home.stats.rank'),
      value: isAnonymous ? t('home.stats.rankCadet') : t('home.stats.rankFleetAdmiral'),
    },
    {
      label: t('home.stats.status'),
      value: isAnonymous ? t('home.stats.statusStandby') : t('home.stats.statusReady'),
    },
    { label: t('home.stats.grid'), value: t('home.stats.gridDefault') },
  ];

  return (
    <motion.main
      className='relative min-h-screen overflow-hidden px-4 py-5 text-(--text-main) sm:px-8'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className='ui-page-bg -z-20' />
      <div className='absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(50,217,255,0.08),transparent_38%)]' />

      <section className='ui-hud-shell mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col rounded-md p-4 sm:p-6'>
        <SectionStatus
          leftText={t('home.status.sectors')}
          rightText={t('home.status.coordinates')}
        />

        <motion.div
          className='relative z-10 mt-4 grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,420px)]'
          variants={staggerParent}
          initial='hidden'
          animate='visible'
        >
          <motion.section
            variants={revealItem}
            className='flex min-h-112 flex-col justify-between gap-6'
          >
            <div className='ui-panel ui-panel-glow rounded-md px-5 py-5 sm:px-7'>
              <div className='relative z-10 flex flex-wrap items-start justify-between gap-4'>
                <div className='flex min-w-0 items-center gap-4'>
                  <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-(--border-strong) bg-(--accent-soft) font-mono text-xl font-bold text-(--accent-secondary) shadow-[0_0_18px_rgba(34,211,238,0.18)]'>
                    B
                  </div>
                  <div className='min-w-0'>
                    <p className='ui-title-eyebrow'>{t('home.title')}</p>
                    <h1 className='mt-2 text-3xl font-black uppercase tracking-[0.08em] text-(--text-main) sm:text-5xl'>
                      {t('home.gameTitle')}
                    </h1>
                    <p className='mt-2 text-sm font-medium tracking-[0.24em] text-(--text-muted) uppercase'>
                      {t('home.gameSubtitle')}
                    </p>
                  </div>
                </div>

                <div className='flex items-start gap-4'>
                  <div className='grid gap-2 text-right'>
                    {tacticalStats.map((stat) => (
                      <div key={stat.label} className='grid gap-0.5'>
                        <span className='ui-data-label'>{stat.label}</span>
                        <span className='ui-data-value text-sm'>{stat.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className='w-px self-stretch bg-(--border-main) opacity-50' />
                  <div className='space-y-2'>
                    <p className='text-xs leading-5 text-(--text-muted)'>
                      {t('home.lore1')}
                    </p>
                    <p className='text-xs leading-5 text-(--text-muted)'>
                      {t('home.lore2')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              variants={revealItem}
              className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]'
            >
              <div className='ui-panel rounded-md px-5 py-6 sm:px-7'>
                <div className='relative z-10'>
                  <p className='ui-title-eyebrow'>{t('home.commanderLink')}</p>
                  <p className='mt-4 text-sm font-semibold tracking-[0.22em] text-(--text-muted) uppercase'>
                    {t('home.playerStatus.label')}
                  </p>

                  {!user ? (
                    <>
                      <p className='mt-3 font-mono text-sm text-(--text-muted)'>
                        {t('home.playerStatus.anonymous')}
                      </p>
                      <p className='mt-4 text-xs font-semibold tracking-[0.18em] text-(--text-subtle) uppercase'>
                        {t('home.accessRules.anonymous')}
                      </p>
                    </>
                  ) : (
                    <div className='mt-3 grid gap-2'>
                      <div className='grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-2'>
                        <span className='ui-data-label text-right'>{t('home.profile.username')}</span>
                        {isAnonymous ? (
                          <span className='font-mono text-sm font-semibold text-(--accent-secondary)'>
                            {user.username}
                          </span>
                        ) : (
                          <button
                            type='button'
                            onClick={() => openModal('profileSetup')}
                            className='cursor-pointer text-left font-mono text-sm font-semibold text-(--accent-secondary) underline underline-offset-4 transition-colors hover:text-white'
                          >
                            {user.username}
                          </button>
                        )}
                        <span className='ui-data-label text-right'>{t('home.profile.signature')}</span>
                        <span className='font-mono text-sm text-(--text-main)'>
                          {user.signature ?? '—'}
                        </span>
                        <span className='ui-data-label text-right'>{t('home.profile.rank')}</span>
                        <span className='font-mono text-sm text-(--text-main)'>
                          {/* {user.rank ?? '—'} */} - - -
                        </span>
                        <span className='ui-data-label text-right'>{t('home.profile.elo')}</span>
                        <span className='font-mono text-sm text-(--text-main)'>
                          {/* {user.elo ?? '—'} */} - - -
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className='ui-panel rounded-md px-5 py-6'>
                <div className='relative z-10 grid gap-4'>
                  <div>
                    <p className='ui-title-eyebrow'>{t('home.systemFeed')}</p>
                  </div>
                  <div className='grid gap-3'>
                    <div className='rounded-sm border border-(--border-main) bg-black/10 px-3 py-3'>
                      <div className='flex flex-row gap-2 items-center'>
                        <span className='w-2 h-2 rounded-full bg-[#22c55e] animate-pulse' />
                        <p className='ui-data-label'>{t('home.signalLabel')}</p>
                      </div>
                      <p className='mt-1 font-mono text-sm text-(--accent-secondary)'>{t('home.signalStatus')}</p>
                    </div>
                    <div className='rounded-sm border border-(--border-main) bg-black/10 px-3 py-3'>
                      <div className='flex flex-row gap-2 items-center'>
                        <span className='w-2 h-2 rounded-full bg-[#22d3ee] animate-pulse' />
                        <p className='ui-data-label'>{t('home.operationLabel')}</p>
                      </div>
                      <p className='mt-1 font-mono text-sm text-(--text-main)'>{t('home.operationStatus')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </motion.section>

          <motion.aside variants={revealItem} className='ui-panel ui-panel-strong rounded-md p-4 sm:p-5'>
            <div className='relative z-10 flex h-full flex-col gap-5'>
              <div className='rounded-sm border border-(--border-main) bg-black/10 px-4 py-4'>
                <p className='ui-title-eyebrow'>{t('home.missionQueue')}</p>
                <h2 className='mt-3 text-2xl font-black uppercase tracking-[0.08em] text-(--text-main)'>
                  {t('home.commandDeck')}
                </h2>
                <p className='mt-2 text-sm leading-6 text-(--text-muted)'>
                  {t('home.commandDeckDesc')}
                </p>
              </div>

              <div className='grid gap-3'>
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...pageTransition, delay: 0.14 + index * 0.05 }}
                  >
                    <Button
                      disabled={item.disabled}
                      onClick={() => handleGameMode(item.id)}
                      variant={item.id === 'playOnline' ? 'primary' : 'default'}
                      className='h-14 justify-start px-5 text-left'
                    >
                      {item.label}
                    </Button>
                  </motion.div>
                ))}
              </div>

              {user && !isAnonymous ? (
                <Button
                  variant='danger'
                  onClick={() => {
                    void handleLogout();
                  }}
                  className='h-12'
                >
                  {t('welcome.modals.logout')}
                </Button>
              ) : (
                <div className='mt-auto grid gap-3 sm:grid-cols-2'>
                  <Button
                    variant='primary'
                    onClick={() => {
                      setLoginError(null);
                      openModal('login');
                    }}
                    className='h-12'
                  >
                    {t('home.menu.login')}
                  </Button>
                  <Button
                    onClick={() => {
                      setRegisterError(null);
                      openModal('register');
                    }}
                    className='h-12'
                  >
                    {t('home.menu.register')}
                  </Button>
                </div>
              )}
            </div>
          </motion.aside>
        </motion.div>
        <motion.p
          variants={revealItem}
          className='ui-data-label px-1 mt-8 mb-2'
        >
          © {currentYear} {t('home.copyright')}
        </motion.p>

        <SectionStatus
          className='mt-auto'
          leftText={t('home.status.system')}
          rightText={t('home.status.radar')}
        />
      </section>

      <LoginModal
        isOpen={isModalOpen && authModalMode === 'login'}
        onClose={closeModal}
        onSubmit={handleSubmitLogin}
        onForgotPassword={() => openModal('forgotPassword')}
        onFieldsChange={() => setLoginError(null)}
        errorMessage={loginError ?? undefined}
      />

      <RegisterModal
        isOpen={isModalOpen && authModalMode === 'register'}
        onClose={closeModal}
        onSubmit={handleSubmitRegister}
        onFieldsChange={() => setRegisterError(null)}
        errorMessage={registerError ?? undefined}
      />

      <ForgotPasswordModal
        isOpen={isModalOpen && authModalMode === 'forgotPassword'}
        onClose={closeModal}
        onSubmit={handleSubmitForgotPassword}
      />

      <ProfileSetupModal
        key={profileSetupModalKey}
        isOpen={isProfileSetupOpen}
        onClose={closeModal}
        onSubmit={handleSubmitProfileSetup}
        onLogout={handleLogout}
        username={user?.username ?? ''}
        signature={user?.signature}
        avatar={user?.avatar}
      />

      <SettingsModal
        isOpen={isModalOpen && authModalMode === 'settings'}
        onClose={closeModal}
      />
    </motion.main>
  );
}
