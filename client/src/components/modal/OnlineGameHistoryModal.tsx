import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BattleStatsBreakdown,
  type BattleStatsNumbers,
} from '@/components/game-play/GamePlayOverlays';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { fetchOnlineMatchHistory } from '@/services/gameHistoryService';
import type { OnlineMatchHistoryItem } from '@/types/matchHistory';

type OnlineGameHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function toBattleStatsNumbers(stats: OnlineMatchHistoryItem['yourStats']): BattleStatsNumbers {
  return {
    shotsFired: stats.shotsFired,
    hits: stats.hits,
    misses: stats.misses,
    accuracy: stats.accuracy,
  };
}

export function OnlineGameHistoryModal({
  isOpen,
  onClose,
}: OnlineGameHistoryModalProps) {
  const { t, i18n } = useTranslation('common');
  const [items, setItems] = useState<OnlineMatchHistoryItem[]>([]);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error' | 'ready'>(
    'idle',
  );
  const [selected, setSelected] = useState<OnlineMatchHistoryItem | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelected(null);
    setLoadState('loading');

    void fetchOnlineMatchHistory(30)
      .then((data) => {
        setItems(data);
        setLoadState('ready');
      })
      .catch(() => {
        setLoadState('error');
      });
  }, [isOpen]);

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  const opponentLabel = (item: OnlineMatchHistoryItem) => {
    const name = item.opponentUsername?.trim();
    if (name) {
      return name.toUpperCase();
    }
    return `${t('home.gameHistory.opponentFallback')} #${item.opponentId.slice(0, 8)}`;
  };

  const formatFinishedAt = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString(i18n.language, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const modalTitle = selected
    ? t('gameBattle.stats.title')
    : t('home.gameHistory.modalTitle');

  return (
    <Modal
      isOpen={isOpen}
      title={modalTitle}
      onClose={handleClose}
      surfaceClassName="max-w-lg"
    >
      {selected ? (
        <div className="grid gap-3">
          <Button
            type="button"
            variant="default"
            className="h-9 justify-self-start px-3 text-xs font-semibold uppercase tracking-[0.12em]"
            onClick={() => setSelected(null)}
          >
            {t('home.gameHistory.back')}
          </Button>
          <p className="font-mono text-xs text-(--text-muted)">
            {formatFinishedAt(selected.finishedAt)} ·{' '}
            <span
              className={
                selected.outcome === 'win'
                  ? 'font-semibold text-[rgba(34,211,238,0.92)]'
                  : 'font-semibold text-[rgba(255,145,110,0.95)]'
              }
            >
              {selected.outcome === 'win'
                ? t('home.gameHistory.win')
                : t('home.gameHistory.loss')}
            </span>
            {' · '}
            {t('home.gameHistory.vs')} {opponentLabel(selected)}
          </p>
          <BattleStatsBreakdown
            primaryFleetTitle={t('gameBattle.stats.youLabel')}
            secondaryFleetTitle={opponentLabel(selected)}
            primary={toBattleStatsNumbers(selected.yourStats)}
            secondary={toBattleStatsNumbers(selected.opponentStats)}
          />
        </div>
      ) : (
        <div className="grid gap-3">
          {loadState === 'loading' && (
            <p className="text-sm text-(--text-muted)">{t('home.gameHistory.loading')}</p>
          )}
          {loadState === 'error' && (
            <p className="text-sm font-semibold text-[#ffb4b4]">
              {t('home.gameHistory.loadError')}
            </p>
          )}
          {loadState === 'ready' && items.length === 0 && (
            <p className="text-sm text-(--text-muted)">{t('home.gameHistory.empty')}</p>
          )}
          {loadState === 'ready' &&
            items.length > 0 &&
            items.map((item) => (
              <button
                key={item.matchId}
                type="button"
                onClick={() => setSelected(item)}
                className="ui-subpanel cursor-pointer rounded-sm border border-transparent px-3 py-3 text-left transition-colors hover:border-[rgba(31,136,176,0.35)] hover:bg-[rgba(34,211,238,0.06)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-(--text-muted)">
                    {formatFinishedAt(item.finishedAt)}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-black uppercase tracking-[0.14em] ${
                      item.outcome === 'win'
                        ? 'text-[rgba(34,211,238,0.92)]'
                        : 'text-[rgba(255,145,110,0.95)]'
                    }`}
                  >
                    {item.outcome === 'win'
                      ? t('home.gameHistory.win')
                      : t('home.gameHistory.loss')}
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm font-semibold text-(--text-main)">
                  {t('home.gameHistory.vs')}{' '}
                  <span className="text-(--accent-secondary)">
                    {item.opponentUsername?.trim() ||
                      `#${item.opponentId.slice(0, 8)}`}
                  </span>
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-(--text-subtle)">
                  {t('home.gameHistory.viewDetails')}
                </p>
              </button>
            ))}
        </div>
      )}
    </Modal>
  );
}
