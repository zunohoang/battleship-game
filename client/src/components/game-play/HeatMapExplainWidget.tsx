import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import type { BoardConfig, AiDifficulty } from '@/types/game';
import type { HeatMapExplanationEntry } from '@/utils/gamePlayUtils';

type HeatExplainData = {
  attackerLabel: string;
  targetLabel: string;
  difficulty: AiDifficulty;
  entries: HeatMapExplanationEntry[];
};

interface HeatMapExplainWidgetProps {
  explanation?: HeatExplainData;
  boardConfig: BoardConfig;
  onOpenChange?: (isOpen: boolean) => void;
  dimOthers?: boolean;
}

function toColumnLabel(index: number): string {
  let value = index;
  let label = '';

  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return label;
}

/** Long ship-placement paths: short summary + expandable list (theme follows ui-panel / CSS vars). */
function PlacementPathsBlock({
  sourceLabels,
  t,
}: {
  sourceLabels: string[];
  t: TFunction;
}) {
  const count = sourceLabels.length;
  if (count === 0) {
    return <span>-</span>;
  }

  return (
    <div className='mt-0.5 space-y-1.5'>
      <p className='text-[10px] leading-snug text-(--text-muted)'>
        {t('gameBattle.heatMapPlacementSummary', { count })}
      </p>
      <details className='ui-subpanel rounded-sm px-2 py-1.5'>
        <summary className='cursor-pointer list-none font-mono text-[10px] font-semibold text-(--accent-secondary) [&::-webkit-details-marker]:hidden'>
          <span className='underline decoration-dotted underline-offset-2'>
            {t('gameBattle.heatMapPlacementListToggle', { count })}
          </span>
        </summary>
        <div className='themed-scrollbar mt-2 max-h-36 space-y-0.5 overflow-y-auto border-t border-(--border-main) pt-2 pr-1'>
          {sourceLabels.map((label, i) => (
            <span
              key={`placement-${i}-${label.slice(0, 24)}`}
              className='block wrap-break-word font-mono text-[9px] leading-relaxed text-(--text-main)'
            >
              {label}
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}

/** Short labels (e.g. cell ids): chips; collapsible if many. */
function ShortLabelsBlock({ labels, t }: { labels: string[]; t: TFunction }) {
  const count = labels.length;
  if (count === 0) {
    return <span>-</span>;
  }

  if (count <= 8) {
    return (
      <span className='mt-0.5 inline-flex flex-wrap gap-1.5'>
        {labels.map((label, i) => (
          <span
            key={`${i}-${label}`}
            className='rounded-sm border border-(--border-main) bg-(--bg-card-soft) px-1.5 py-px font-mono text-[9px] text-(--text-main)'
          >
            {label}
          </span>
        ))}
      </span>
    );
  }

  return (
    <details className='ui-subpanel mt-0.5 rounded-sm px-2 py-1.5'>
      <summary className='cursor-pointer list-none font-mono text-[10px] font-semibold text-(--accent-secondary) [&::-webkit-details-marker]:hidden'>
        <span className='underline decoration-dotted underline-offset-2'>
          {t('gameBattle.heatMapPlacementListToggle', { count })}
        </span>
      </summary>
      <div className='themed-scrollbar mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto border-t border-(--border-main) pt-2 pr-1'>
        {labels.map((label, i) => (
          <span
            key={`${i}-${label}`}
            className='rounded-sm border border-(--border-main) bg-(--bg-card-soft) px-1.5 py-px font-mono text-[9px] text-(--text-main)'
          >
            {label}
          </span>
        ))}
      </div>
    </details>
  );
}

function ClusterSourcesBlock({
  sourceLabels,
  t,
}: {
  sourceLabels: string[];
  t: TFunction;
}) {
  const count = sourceLabels.length;
  if (count === 0) {
    return <span>-</span>;
  }

  const avgLen =
    sourceLabels.reduce((acc, s) => acc + s.length, 0) / Math.max(1, count);
  const useDetails = count > 4 || avgLen > 48;

  if (!useDetails) {
    return (
      <span className='mt-0.5 block space-y-0.5'>
        {sourceLabels.map((label) => (
          <span key={label} className='block wrap-break-word font-mono text-[9px] text-(--text-main)'>
            {label}
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className='mt-0.5 space-y-1'>
      <details className='ui-subpanel rounded-sm px-2 py-1.5'>
        <summary className='cursor-pointer list-none font-mono text-[10px] font-semibold text-(--accent-secondary) [&::-webkit-details-marker]:hidden'>
          <span className='underline decoration-dotted underline-offset-2'>
            {t('gameBattle.heatMapPlacementListToggle', { count })}
          </span>
        </summary>
        <div className='themed-scrollbar mt-2 max-h-32 space-y-0.5 overflow-y-auto border-t border-(--border-main) pt-2 pr-1'>
          {sourceLabels.map((label, i) => (
            <span
              key={`cl-${i}-${label.slice(0, 20)}`}
              className='block wrap-break-word font-mono text-[9px] leading-relaxed text-(--text-main)'
            >
              {label}
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}

export function HeatMapExplainWidget({
  explanation,
  boardConfig,
  onOpenChange,
  dimOthers = false,
}: HeatMapExplainWidgetProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pageIndex, setPageIndex] = useState(0);

  const pageCount = Math.max(1, boardConfig.cols + 1);
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const isTheoryPage = currentPage === 0;
  const currentColX = Math.max(0, currentPage - 1);
  const currentColLabel = isTheoryPage
    ? t('gameBattle.heatMapTheoryTab')
    : toColumnLabel(currentColX);

  const rowIndices = useMemo(
    () => Array.from({ length: boardConfig.rows }, (_, row) => row),
    [boardConfig.rows],
  );

  const entryMap = useMemo(() => {
    const map = new Map<string, HeatMapExplanationEntry>();

    for (const entry of explanation?.entries ?? []) {
      map.set(`${entry.x},${entry.y}`, entry);
    }

    return map;
  }, [explanation]);

  const openPanel = () => {
    setOffset({ x: 0, y: 0 });
    setPageIndex(0);
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const closePanel = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  return (
    <>
      <Button
        onClick={openPanel}
        disabled={!explanation}
        className={`h-8 px-3 text-[10px] md:w-auto ${
          isOpen
            ? 'border-[rgba(117,235,255,0.96)] bg-[rgba(117,235,255,0.16)] text-(--accent-secondary) shadow-[0_0_22px_rgba(34,211,238,0.42)]'
            : ''
        } ${
          dimOthers && !isOpen ? 'opacity-12 grayscale-[1] saturate-0 pointer-events-none' : ''
        }`}
      >
        {t('gameBattle.explainHeatMap')}
      </Button>

      {typeof document !== 'undefined'
        ? createPortal(
          <AnimatePresence>
            {isOpen ? (
              <motion.div
                className='themed-scrollbar ui-panel ui-panel-strong fixed left-3 top-3 z-1000 w-[min(92vw,42rem)] overflow-hidden rounded-md text-(--text-main)'
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                }}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                drag
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  setOffset((current) => ({
                    x: current.x + info.offset.x,
                    y: current.y + info.offset.y,
                  }));
                }}
              >
                <div className='flex cursor-move items-start justify-between gap-3 border-b border-(--border-main) px-4 py-3'>
                  <div>
                    <p className='ui-data-label'>{t('gameBattle.explainHeatMap')}</p>
                    <h2 className='mt-1 font-mono text-sm font-black uppercase tracking-[0.14em] text-(--accent-secondary)'>
                      {t('gameBattle.heatMapExplainTitle')}
                    </h2>
                    {explanation ? (
                      <p className='mt-2 text-xs text-(--text-muted)'>
                        {explanation.attackerLabel} {'->'} {explanation.targetLabel}
                      </p>
                    ) : null}
                    <p className='mt-1 font-mono text-xs text-(--text-muted)'>
                      {currentColLabel} — {currentPage + 1} / {pageCount}
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={closePanel}
                    className='ui-button-shell ui-button-default cursor-pointer rounded-sm border px-3 py-1.5 text-sm font-semibold text-(--text-main)'
                  >
                    X
                  </button>
                </div>

                <div className='space-y-3 px-4 py-3'>
                  {isTheoryPage ? (
                    <div className='themed-scrollbar max-h-[50vh] space-y-3 overflow-y-auto pr-1'>
                      <div className='ui-subpanel rounded-sm px-3 py-2'>
                        <p className='font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--accent-secondary)'>
                          {t('gameBattle.heatMapTheoryPseudoTitle')}
                        </p>
                        <pre className='mt-2 overflow-x-auto font-mono text-[10px] leading-5 text-(--text-main) whitespace-pre-wrap'>{t('gameBattle.heatMapTheoryPseudoCode')}</pre>
                      </div>

                      <div className='ui-subpanel rounded-sm px-3 py-2'>
                        <p className='font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--accent-secondary)'>
                          {t('gameBattle.heatMapTheoryTermsTitle')}
                        </p>
                        <div className='mt-2 space-y-2 text-[10px] leading-5 text-(--text-main)'>
                          <div>
                            <span className='font-semibold text-(--accent-secondary)'>{t('gameBattle.heatMapTheoryTermBaseLabel')}</span>{' '}
                            <span className='text-(--text-muted)'>{t('gameBattle.heatMapTheoryTermBaseDesc')}</span>
                          </div>
                          <div>
                            <span className='font-semibold text-(--accent-secondary)'>{t('gameBattle.heatMapTheoryTermParityLabel')}</span>{' '}
                            <span className='text-(--text-muted)'>{t('gameBattle.heatMapTheoryTermParityDesc')}</span>
                          </div>
                          <div>
                            <span className='font-semibold text-(--accent-secondary)'>{t('gameBattle.heatMapTheoryTermCenterLabel')}</span>{' '}
                            <span className='text-(--text-muted)'>{t('gameBattle.heatMapTheoryTermCenterDesc')}</span>
                          </div>
                          <div>
                            <span className='font-semibold text-(--accent-secondary)'>{t('gameBattle.heatMapTheoryTermAdjacencyLabel')}</span>{' '}
                            <span className='text-(--text-muted)'>{t('gameBattle.heatMapTheoryTermAdjacencyDesc')}</span>
                          </div>
                          <div>
                            <span className='font-semibold text-(--accent-secondary)'>{t('gameBattle.heatMapTheoryTermClusterLabel')}</span>{' '}
                            <span className='text-(--text-muted)'>{t('gameBattle.heatMapTheoryTermClusterDesc')}</span>
                          </div>
                        </div>
                      </div>

                      <div className='ui-subpanel rounded-sm px-3 py-2'>
                        <p className='font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-(--accent-secondary)'>
                          {t('gameBattle.heatMapTheoryHowTitle')}
                        </p>
                        <div className='mt-2 space-y-1.5 text-[10px] leading-5 text-(--text-muted)'>
                          <p>{t('gameBattle.heatMapTheoryHowLine1')}</p>
                          <p>{t('gameBattle.heatMapTheoryHowLine2')}</p>
                          <p>{t('gameBattle.heatMapTheoryHowLine3')}</p>
                          <p>{t('gameBattle.heatMapTheoryHowLine4')}</p>
                        </div>
                      </div>
                    </div>
                  ) : explanation?.difficulty !== 'probability' ? (
                    <p className='text-sm leading-6 text-(--text-muted)'>
                      {t('gameBattle.heatMapExplainUnsupported')}
                    </p>
                  ) : (
                    <>
                      <div className='themed-scrollbar max-h-[50vh] space-y-1.5 overflow-y-auto pr-1'>
                        {rowIndices.map((y) => {
                          const entry = entryMap.get(`${currentColX},${y}`);
                          const coordLabel = `${currentColLabel}${y + 1}`;

                          if (!entry || entry.attempted) {
                            return (
                              <div
                                key={`row-${y}`}
                                className='ui-subpanel flex items-center gap-2 rounded-sm px-2.5 py-1.5 font-mono text-[10px]'
                              >
                                <span className='w-7 shrink-0 text-right font-bold text-(--accent-secondary)'>
                                  {coordLabel}
                                </span>
                                <span className='text-(--text-subtle)'>
                                  {t('gameBattle.heatMapAttempted')} — 0
                                </span>
                              </div>
                            );
                          }

                          const modeLabel =
                            entry.mode === 'hunt'
                              ? t('gameBattle.heatMapModeHunt')
                              : entry.mode === 'target'
                                ? t('gameBattle.heatMapModeTarget')
                                : t('gameBattle.heatMapModeCluster');

                          return (
                            <div
                              key={`row-${y}`}
                              className='ui-subpanel rounded-sm px-2.5 py-1.5'
                            >
                              <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px]'>
                                <span className='font-bold text-(--accent-secondary)'>{coordLabel}</span>
                                <span className='rounded px-1 py-px text-[8px] font-bold uppercase tracking-wider bg-(--accent-soft) text-(--accent-secondary)'>
                                  {modeLabel}
                                </span>
                              </div>
                              <div className='mt-1.5 space-y-0.5 pl-3 font-mono text-[10px]'>
                                {entry.mode === 'hunt' && (
                                  <>
                                    <div className='ui-subpanel space-y-0.5 rounded-sm px-2 py-1'>
                                      <div className='flex gap-1.5'>
                                        <span className='w-3 shrink-0 text-right text-(--text-muted)'>+</span>
                                        <span className='w-5 shrink-0 text-right tabular-nums text-(--text-main)'>{entry.base}</span>
                                        <span className='text-(--text-subtle)'>{t('gameBattle.heatMapExplainHuntBase')}</span>
                                      </div>
                                      <div className='text-(--text-muted)'>
                                        <span>{t('gameBattle.heatMapSourcePlacements')}:</span>
                                        <PlacementPathsBlock sourceLabels={entry.basePlacementLabels} t={t} />
                                      </div>
                                    </div>
                                    <div className='ui-subpanel space-y-0.5 rounded-sm px-2 py-1'>
                                      <div className='flex gap-1.5'>
                                        <span className='w-3 shrink-0 text-right text-(--text-muted)'>+</span>
                                        <span className='w-5 shrink-0 text-right tabular-nums text-(--text-main)'>{entry.parityBonus}</span>
                                        <span className='text-(--text-subtle)'>{t('gameBattle.heatMapExplainHuntParity')}</span>
                                      </div>
                                      <div className='text-(--text-muted)'>
                                        {entry.parityBonus > 0
                                          ? t('gameBattle.heatMapParitySourceActive', { cell: coordLabel })
                                          : t('gameBattle.heatMapParitySourceInactive', { cell: coordLabel })}
                                      </div>
                                    </div>
                                    <div className='ui-subpanel space-y-0.5 rounded-sm px-2 py-1'>
                                      <div className='flex gap-1.5'>
                                        <span className='w-3 shrink-0 text-right text-(--text-muted)'>+</span>
                                        <span className='w-5 shrink-0 text-right tabular-nums text-(--text-main)'>{entry.centerBonus}</span>
                                        <span className='text-(--text-subtle)'>{t('gameBattle.heatMapExplainHuntCenter')}</span>
                                      </div>
                                      <div className='text-(--text-muted)'>
                                        {t('gameBattle.heatMapCenterSource', { cell: coordLabel })}
                                      </div>
                                    </div>
                                  </>
                                )}
                                {entry.mode === 'target' && (
                                  <>
                                    <div className='ui-subpanel space-y-0.5 rounded-sm px-2 py-1'>
                                      <div className='flex gap-1.5'>
                                        <span className='w-3 shrink-0 text-right text-(--text-muted)'>+</span>
                                        <span className='w-5 shrink-0 text-right tabular-nums text-(--text-main)'>{entry.base}</span>
                                        <span className='text-(--text-subtle)'>{t('gameBattle.heatMapExplainTargetBase')}</span>
                                      </div>
                                      <div className='text-(--text-muted)'>
                                        <span>{t('gameBattle.heatMapSourcePlacements')}:</span>
                                        <PlacementPathsBlock sourceLabels={entry.basePlacementLabels} t={t} />
                                      </div>
                                    </div>
                                    <div className='ui-subpanel space-y-0.5 rounded-sm px-2 py-1'>
                                      <div className='flex gap-1.5'>
                                        <span className='w-3 shrink-0 text-right text-(--text-muted)'>+</span>
                                        <span className='w-5 shrink-0 text-right tabular-nums text-(--text-main)'>{entry.adjacencyBonus}</span>
                                        <span className='text-(--text-subtle)'>{t('gameBattle.heatMapExplainTargetAdjacency')}</span>
                                      </div>
                                      <div className='text-(--text-muted)'>
                                        <span>{t('gameBattle.heatMapSourceHits')}:</span>
                                        <ShortLabelsBlock labels={entry.adjacencySourceLabels} t={t} />
                                      </div>
                                    </div>
                                  </>
                                )}
                                {entry.mode === 'cluster' && (
                                  <div className='ui-subpanel space-y-0.5 rounded-sm px-2 py-1'>
                                    <div className='flex gap-1.5'>
                                      <span className='w-3 shrink-0 text-right text-(--text-muted)'>+</span>
                                      <span className='w-5 shrink-0 text-right tabular-nums text-(--text-main)'>{entry.isFocusCandidate ? 1 : 0}</span>
                                      <span className='text-(--text-subtle)'>{t('gameBattle.heatMapClusterSourceTitle')}</span>
                                    </div>
                                    <div className='text-(--text-muted)'>
                                      <span>{t('gameBattle.heatMapSourceClusters')}:</span>
                                      <ClusterSourcesBlock sourceLabels={entry.clusterSourceLabels} t={t} />
                                    </div>
                                  </div>
                                )}
                                <div className='mt-0.5 flex gap-1.5 border-t border-(--border-main) pt-0.5'>
                                  <span className='w-3 shrink-0 text-right font-bold text-(--accent-secondary)'>=</span>
                                  <span className='w-5 shrink-0 text-right tabular-nums font-bold text-(--accent-secondary)'>{entry.total}</span>
                                  <span className='text-(--text-muted)'>{t('gameBattle.heatMapTotal')}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <div className='flex flex-wrap items-center justify-center gap-1 border-t border-(--border-main) px-4 py-2'>
                  {Array.from({ length: pageCount }, (_, i) => {
                    const label = i === 0 ? t('gameBattle.heatMapTheoryTab') : toColumnLabel(i - 1);
                    const isActive = i === currentPage;

                    return (
                      <button
                        key={label}
                        type='button'
                        onClick={() => setPageIndex(i)}
                        className={`cursor-pointer h-6 min-w-6 rounded px-1.5 font-mono text-[10px] font-semibold transition-colors ${
                          isActive
                            ? 'bg-(--accent-soft) text-(--accent-secondary) ring-1 ring-(--border-strong)'
                            : 'text-(--text-muted) hover:bg-(--bg-card-soft) hover:text-(--text-main)'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
        : null}
    </>
  );
}
