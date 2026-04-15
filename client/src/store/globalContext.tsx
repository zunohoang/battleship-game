/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  clearAccessToken,
  getAccessToken,
  getAccessTokenUserId,
} from '@/services/authToken';
import { getSessionStatus, getUserProfile } from '@/services/authService';
import { setForceLogoutCallback } from '@/services/interceptors';

const AUTH_USER_STORAGE_KEY = 'auth.user';

export interface GlobalUser {
  id: string | null;
  username: string;
  avatar: string | null;
  signature: string | null;
  elo: number;
  role?: string;
  isAnonymous: boolean;
}

export const ANONYMOUS_USER: GlobalUser = {
  id: null,
  username: 'Alpha',
  avatar: null,
  signature: '- - -',
  elo: 0,
  role: undefined,
  isAnonymous: true,
};

export interface GlobalContextValue {
  user: GlobalUser;
  isLoggedIn: boolean;
  setUser: Dispatch<SetStateAction<GlobalUser>>;
  logout: () => void;
}

export const GlobalContext = createContext<GlobalContextValue | null>(null);

const isGlobalUser = (value: unknown): value is GlobalUser => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const { id, username, avatar, signature, elo, role, isAnonymous } = candidate;

  return (
    (typeof id === 'string' || id === null) &&
    typeof username === 'string' &&
    (typeof avatar === 'string' || avatar === null) &&
    (typeof signature === 'string' || signature === null) &&
    typeof elo === 'number' &&
    (typeof role === 'string' || typeof role === 'undefined') &&
    typeof isAnonymous === 'boolean'
  );
};

const normalizeStoredUser = (value: unknown): GlobalUser => {
  if (isGlobalUser(value)) {
    return value;
  }

  if (typeof value !== 'object' || value === null) {
    return ANONYMOUS_USER;
  }

  const candidate = value as Record<string, unknown>;
  const { id, username, avatar, signature, role } = candidate;

  if (
    (typeof id !== 'string' && id !== null && typeof id !== 'undefined') ||
    typeof username !== 'string' ||
    (typeof avatar !== 'string' && avatar !== null) ||
    (typeof signature !== 'string' && signature !== null)
  ) {
    return ANONYMOUS_USER;
  }

  const eloRaw = candidate.elo;
  return {
    id: typeof id === 'string' ? id : getAccessTokenUserId(),
    username,
    avatar,
    signature,
    elo: typeof eloRaw === 'number' ? eloRaw : 0,
    role: typeof role === 'string' ? role : undefined,
    isAnonymous: false,
  };
};

const loadStoredUser = (): GlobalUser => {
  try {
    const token = getAccessToken();
    if (!token) {
      return ANONYMOUS_USER;
    }

    const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) {
      return ANONYMOUS_USER;
    }

    const parsed = JSON.parse(raw);
    const normalized = normalizeStoredUser(parsed);

    if (normalized.isAnonymous || !normalized.id) {
      return ANONYMOUS_USER;
    }

    return normalized;
  } catch {
    return ANONYMOUS_USER;
  }
};

const saveStoredUser = (user: GlobalUser): void => {
  try {
    if (user.isAnonymous) {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      return;
    }

    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Ignore storage errors and keep auth state in memory.
  }
};

export function GlobalProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  const [user, setUserState] = useState<GlobalUser>(() => loadStoredUser());
  const [isSessionExpiredModalOpen, setSessionExpiredModalOpen] =
    useState(false);
  const [sessionModalTitle, setSessionModalTitle] = useState<string>(
    t('errors.SESSION_EXPIRED_TITLE'),
  );
  const [shouldLogoutOnAcknowledge, setShouldLogoutOnAcknowledge] =
    useState(false);

  useEffect(() => {
    saveStoredUser(user);
  }, [user]);

  useEffect(() => {
    if (
      !user?.id ||
      user.isAnonymous ||
      (user.elo > 0 && typeof user.role === 'string' && user.role.length > 0)
    ) {
      return;
    }

    let cancelled = false;
    void getUserProfile(user.id).then((profile) => {
      if (cancelled) {
        return;
      }
      setUserState((prev) =>
        prev && !prev.isAnonymous && prev.id === user.id
          ? { ...prev, elo: profile.elo, role: profile.role }
          : prev,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.isAnonymous, user?.elo, user?.role]);

  useEffect(() => {
    if (user.isAnonymous || !getAccessToken()) {
      return;
    }

    let cancelled = false;
    const pollSession = async () => {
      try {
        const session = await getSessionStatus();
        if (cancelled) {
          return;
        }
        setUserState((prev) => {
          if (prev.isAnonymous) {
            return prev;
          }
          const nextRole = session.role?.toUpperCase();
          if (!nextRole || prev.role?.toUpperCase() === nextRole) {
            return prev;
          }
          return { ...prev, role: nextRole };
        });
      } catch {
        // Interceptor handles USER_BANNED and expired-session flows globally.
      }
    };

    void pollSession();
    const timer = window.setInterval(() => {
      if (!cancelled) {
        void pollSession();
      }
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user.isAnonymous]);

  const logout = useCallback(() => {
    clearAccessToken();
    setUserState(ANONYMOUS_USER);
  }, []);

  const redirectToWelcome = useCallback(() => {
    window.location.assign('/');
  }, []);

  const acknowledgeForceLogout = useCallback(() => {
    if (shouldLogoutOnAcknowledge) {
      logout();
    }
    setSessionExpiredModalOpen(false);
    setShouldLogoutOnAcknowledge(false);
    redirectToWelcome();
  }, [logout, redirectToWelcome, shouldLogoutOnAcknowledge]);

  const handleForceLogout = useCallback(
    (reasonCode?: string) => {
      const resolveTitle = (): string => {
        if (reasonCode === 'USER_BANNED') {
          return t('errors.USER_BANNED');
        }
        return t('errors.SESSION_EXPIRED_TITLE');
      };

      if (reasonCode === 'INVALID_REFRESH_TOKEN') {
        logout();
        setSessionModalTitle(resolveTitle());
        setShouldLogoutOnAcknowledge(false);
        setSessionExpiredModalOpen(true);
        return;
      }

      if (reasonCode === 'USER_BANNED') {
        setSessionModalTitle(resolveTitle());
        setShouldLogoutOnAcknowledge(true);
        setSessionExpiredModalOpen(true);
        return;
      }

      logout();
    },
    [logout, t],
  );

  useEffect(() => {
    setForceLogoutCallback(handleForceLogout);
  }, [handleForceLogout]);

  return (
    <GlobalContext.Provider
      value={{
        user,
        isLoggedIn: !user.isAnonymous,
        setUser: setUserState,
        logout,
      }}
    >
      {children}
      <Modal
        isOpen={isSessionExpiredModalOpen}
        title={sessionModalTitle}
        onClose={acknowledgeForceLogout}
      >
        <div className="mt-4">
          <Button variant="primary" onClick={acknowledgeForceLogout}>
            {shouldLogoutOnAcknowledge
              ? t('gameRooms.banAcknowledgeConfirm')
              : t('errors.goHome')}
          </Button>
        </div>
      </Modal>
    </GlobalContext.Provider>
  );
}
