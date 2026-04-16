import { useEffect, useMemo, useState } from 'react';
import {
  Shield,
  Activity,
  MessagesSquare,
  Users,
  ClipboardList,
  ChevronLeft,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useGlobalContext } from '@/hooks/useGlobalContext';
import { getApiErrorCode } from '@/services/httpError';
import { getAdminOverview } from '@/services/adminService';
import type { AdminOverview } from '@/types/admin';
import { AdminOverviewSection } from '@/components/admin/AdminOverviewSection';
import { AdminMatchesSection } from '@/components/admin/AdminMatchesSection';
import { AdminModerationQueueSection } from '@/components/admin/AdminModerationQueueSection';
import { AdminUsersSection } from '@/components/admin/AdminUsersSection';
import { AdminAuditLogsSection } from '@/components/admin/AdminAuditLogsSection';

type AdminSection = 'overview' | 'matches' | 'forum' | 'users' | 'audit';

const NAV_ITEMS: Array<{
  key: AdminSection;
  labelKey: string;
  icon: typeof Shield;
}> = [
  { key: 'overview', labelKey: 'adminDashboard.nav.overview', icon: Shield },
  { key: 'matches', labelKey: 'adminDashboard.nav.matches', icon: Activity },
  { key: 'forum', labelKey: 'adminDashboard.nav.forum', icon: MessagesSquare },
  { key: 'users', labelKey: 'adminDashboard.nav.users', icon: Users },
  { key: 'audit', labelKey: 'adminDashboard.nav.audit', icon: ClipboardList },
];

export function AdminDashboardPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { user, isLoggedIn } = useGlobalContext();
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  const canAccessAdminDashboard = useMemo(
    () => {
      const role = user?.role?.toUpperCase();
      return role === 'ADMIN' || role === 'MOD';
    },
    [user?.role],
  );

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/home');
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (!canAccessAdminDashboard) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingOverview(true);
      setErrorCode(null);
      try {
        const overviewData = await getAdminOverview();
        if (cancelled) {
          return;
        }
        setOverview(overviewData);
      } catch (error) {
        if (!cancelled) {
          setErrorCode(getApiErrorCode(error));
        }
      } finally {
        if (!cancelled) {
          setLoadingOverview(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [canAccessAdminDashboard]);

  if (!canAccessAdminDashboard) {
    return (
      <main className='relative min-h-screen p-4 text-(--text-main) sm:p-8'>
        <div className='ui-page-bg -z-20' />
        <section className='ui-hud-shell mx-auto max-w-4xl rounded-md p-6'>
          <div className='ui-panel rounded-md p-6'>
            <p className='ui-title-eyebrow'>Admin Access</p>
            <h1 className='mt-3 text-2xl font-black uppercase tracking-[0.08em]'>
              {t('adminDashboard.unauthorizedTitle')}
            </h1>
            <p className='mt-3 text-sm text-(--text-muted)'>
              {t('adminDashboard.unauthorizedDescription')}
            </p>
            <Button className='mt-5 w-auto px-6' onClick={() => navigate('/home')}>
              {t('adminDashboard.backHome')}
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className='relative h-screen overflow-hidden p-4 text-(--text-main) sm:p-8'>
      <div className='ui-page-bg -z-20' />
      <section className='ui-hud-shell mx-auto flex h-full w-full max-w-7xl min-h-0 flex-col gap-4 rounded-md p-4 sm:p-6'>
        <header className='ui-panel flex w-full min-w-0 shrink-0 items-center justify-between gap-3 rounded-lg border border-(--panel-stroke) px-4 py-3 shadow-(--hud-shadow) sm:gap-4 sm:px-5 sm:py-4'>
          <div className='min-w-0 flex-1'>
            <p className='ui-title-eyebrow'>{t('adminDashboard.eyebrow')}</p>
            <h1 className='mt-1 text-xl font-black uppercase tracking-[0.08em] sm:text-2xl'>
              {t('adminDashboard.title')}
            </h1>
            {errorCode ? (
              <p className='mt-2 text-sm font-semibold text-(--accent-danger)'>
                {t('adminDashboard.errorWithCode', { code: errorCode })}
              </p>
            ) : null}
          </div>
          <Button
            type='button'
            variant='default'
            className='h-10! w-auto! shrink-0 whitespace-nowrap px-4 sm:px-5 inline-flex items-center justify-center gap-2'
            onClick={() => navigate('/home')}
          >
            <ChevronLeft className='h-4 w-4 shrink-0' aria-hidden />
            <span>{t('adminDashboard.backHome')}</span>
          </Button>
        </header>

        <div className='grid min-h-0 flex-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]'>
          <aside className='ui-panel rounded-md p-3 lg:min-h-0 lg:overflow-y-auto'>
            <div className='grid gap-2'>
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type='button'
                  onClick={() => setActiveSection(item.key)}
                  className={[
                    'ui-state-idle flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm font-semibold',
                    activeSection === item.key ? 'ring-1 ring-(--border-strong)' : '',
                  ].join(' ')}
                >
                  <item.icon className='h-4 w-4' />
                  <span>{t(item.labelKey)}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className='ui-panel themed-scrollbar min-h-0 overflow-y-auto rounded-md p-4 sm:p-5'>
            {loadingOverview && activeSection === 'overview' ? (
              <p className='text-sm text-(--text-muted)'>
                {t('adminDashboard.loading')}
              </p>
            ) : null}

            {!loadingOverview && activeSection === 'overview' && overview ? (
              <AdminOverviewSection overview={overview} />
            ) : null}

            {activeSection === 'matches' ? <AdminMatchesSection /> : null}
            {activeSection === 'forum' ? <AdminModerationQueueSection /> : null}
            {activeSection === 'users' ? <AdminUsersSection /> : null}
            {activeSection === 'audit' ? <AdminAuditLogsSection /> : null}
          </section>
        </div>
      </section>
    </main>
  );
}
