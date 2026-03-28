import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { SectionStatus } from '@/components/ui/SectionStatus';
import { fetchLeaderboard, type LeaderboardEntry } from '@/services/leaderboardService';
import type { RankTierId } from '@/utils/rankTier';

const pageTransition = { duration: 0.52, ease: [0.16, 1, 0.3, 1] } as const;

const revealItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: pageTransition,
  },
};

const RANK_TIER_ORDER: RankTierId[] = [
  'apprenticeSailor',
  'combatNavigator',
  'eliteCaptain',
  'fleetAdmiral',
  'oceanConqueror',
];

export function LeaderboardPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  useEffect(() => {
    void fetchLeaderboard(100)
      .then((data) => {
        setEntries(data);
        setLoadState('ready');
      })
      .catch(() => setLoadState('error'));
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <motion.main
      className="relative min-h-screen overflow-hidden px-4 py-5 text-(--text-main) sm:px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="ui-page-bg -z-20" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(50,217,255,0.08),transparent_38%)]" />

      <section className="ui-hud-shell mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-4xl flex-col rounded-md p-4 sm:p-6">
        <SectionStatus
          leftText={t('home.status.sectors')}
          rightText={t('home.status.coordinates')}
        />

        <motion.div variants={revealItem} initial="hidden" animate="visible" className="mt-4">
          <Button
            type="button"
            variant="default"
            className="mb-4 grid h-11 w-full grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-0 px-1 py-0 sm:h-12"
            onClick={() => navigate('/home')}
          >
            <span className="flex h-full items-center justify-center">
              <ChevronLeft size={18} strokeWidth={2.2} aria-hidden className="shrink-0" />
            </span>
            <span className="min-w-0 truncate px-1 text-center text-[11px] font-bold leading-tight tracking-[0.1em] sm:text-sm sm:tracking-[0.14em]">
              {t('leaderboard.backHome')}
            </span>
            <span aria-hidden className="inline-block" />
          </Button>

          <div className="ui-panel rounded-md px-5 py-6 sm:px-7">
            <p className="ui-title-eyebrow">{t('leaderboard.eyebrow')}</p>
            <h1 className="mt-3 text-2xl font-black uppercase tracking-[0.08em] text-(--text-main) sm:text-3xl">
              {t('leaderboard.title')}
            </h1>
            <p className="mt-2 text-sm leading-6 text-(--text-muted)">
              {t('leaderboard.subtitle')}
            </p>
          </div>

          <div className="ui-panel mt-6 rounded-md px-5 py-6 sm:px-7">
            {loadState === 'loading' && (
              <p className="text-sm text-(--text-muted)">{t('leaderboard.loading')}</p>
            )}
            {loadState === 'error' && (
              <p className="text-sm font-semibold text-[#ffb4b4]">
                {t('leaderboard.error')}
              </p>
            )}
            {loadState === 'ready' && entries.length === 0 && (
              <p className="text-sm text-(--text-muted)">{t('leaderboard.empty')}</p>
            )}
            {loadState === 'ready' && entries.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(31,136,176,0.22)]">
                      <th className="ui-data-label py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.14em]">
                        {t('leaderboard.colRank')}
                      </th>
                      <th className="ui-data-label py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.14em]">
                        {t('leaderboard.colCommander')}
                      </th>
                      <th className="ui-data-label py-2 pr-3 font-mono text-[10px] uppercase tracking-[0.14em]">
                        {t('leaderboard.colTier')}
                      </th>
                      <th className="ui-data-label py-2 text-right font-mono text-[10px] uppercase tracking-[0.14em]">
                        {t('leaderboard.colElo')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((row) => (
                      <tr
                        key={row.userId}
                        className="border-b border-[rgba(31,136,176,0.12)]"
                      >
                        <td className="py-2.5 pr-3 font-mono text-sm font-bold text-(--accent-secondary)">
                          #{row.rank}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-sm text-(--text-main)">
                          {row.username}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-xs leading-snug text-(--text-muted)">
                          {t(`rank.tiers.${row.rankTierId}.name`)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-sm font-semibold text-(--text-main)">
                          {row.elo}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="ui-panel mt-6 rounded-md px-5 py-6 sm:px-7">
            <h2 className="font-mono text-xs font-black uppercase tracking-[0.2em] text-(--accent-secondary)">
              {t('rank.referenceTitle')}
            </h2>
            <ul className="mt-4 grid gap-3">
              {RANK_TIER_ORDER.map((id) => (
                <li
                  key={id}
                  className="ui-subpanel rounded-sm border border-[rgba(31,136,176,0.15)] px-3 py-3"
                >
                  <p className="font-mono text-sm font-semibold text-(--text-main)">
                    {t(`rank.tiers.${id}.name`)}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-(--accent-secondary)">
                    {t(`rank.tiers.${id}.eloBand`)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-(--text-muted)">
                    {t(`rank.tiers.${id}.blurb`)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="ui-panel mt-6 rounded-md px-5 py-6 sm:px-7">
            <h2 className="font-mono text-xs font-black uppercase tracking-[0.2em] text-(--accent-secondary)">
              {t('rank.eloRulesTitle')}
            </h2>
            <p className="mt-3 text-sm leading-6 text-(--text-muted)">
              {t('rank.eloRulesIntro')}
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-(--text-muted)">
              <li>{t('rank.eloRulePlain1')}</li>
              <li>{t('rank.eloRulePlain2')}</li>
              <li>{t('rank.eloRulePlain3')}</li>
            </ul>
            <h3 className="mt-5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-(--text-subtle)">
              {t('rank.eloRulesKTitle')}
            </h3>
            <p className="mt-2 text-sm leading-6 text-(--text-muted)">
              {t('rank.eloRulesKIntro')}
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-(--text-muted)">
              <li>{t('rank.eloRuleKLow')}</li>
              <li>{t('rank.eloRuleKMid')}</li>
              <li>{t('rank.eloRuleKHigh')}</li>
            </ul>
            <p className="mt-4 border-t border-[rgba(31,136,176,0.15)] pt-4 text-xs leading-5 text-(--text-subtle)">
              {t('rank.eloRulesFormulaNote')}
            </p>
          </div>
        </motion.div>

        <p className="ui-data-label mt-8 mb-2 px-1">
          © {currentYear} {t('home.copyright')}
        </p>
        <SectionStatus
          className="mt-auto"
          leftText={t('home.status.system')}
          rightText={t('home.status.radar')}
        />
      </section>
    </motion.main>
  );
}
