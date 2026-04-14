import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type {
  AiDifficulty,
  Orientation,
  PlacedShip,
} from '@/types/game';
import type { ShipInstance } from '@/services/bots/core/shared/placementUtils';
import { instanceKey } from '@/services/bots/core/shared/placementUtils';

interface PlacementSidebarProps {
  shipInstances: ShipInstance[];
  placementsByInstanceKey: Map<string, PlacedShip>;
  selectedInstanceKey: string | null;
  placedShipsCount: number;
  totalRequiredShips: number;
  isOpponentReady: boolean;
  statusText: string;
  hasError: boolean;
  onSelectInstance: (key: string) => void;
  onRemovePlaced: (definitionId: string, instanceIndex: number) => void;
  onRandomPlace: () => void;
  orientation: Orientation;
  onRotate: (key?: string) => void;
  onClearBoard: () => void;
  primaryActionLabel?: string;
  primaryActionDisabled: boolean;
  onPrimaryAction?: () => void;
  aiDifficulty?: AiDifficulty;
  onAiDifficultyChange?: (d: AiDifficulty) => void;
  difficultyOptions?: AiDifficulty[];
  onStrategicPlace?: () => void;
  botSwitcher?: ReactNode;
  opponentReadyLabel?: string;
}

export function PlacementSidebar({
  shipInstances,
  placementsByInstanceKey,
  selectedInstanceKey,
  placedShipsCount,
  totalRequiredShips,
  isOpponentReady,
  statusText,
  hasError,
  orientation,
  onSelectInstance,
  onRemovePlaced,
  onRandomPlace,
  onRotate,
  onClearBoard,
  primaryActionDisabled,
  onPrimaryAction,
  aiDifficulty,
  onAiDifficultyChange,
  difficultyOptions = ['random', 'learning', 'probability', 'llm'],
  onStrategicPlace,
  botSwitcher,
  opponentReadyLabel,
}: PlacementSidebarProps) {
  const { t } = useTranslation();
  const [isGuideModalOpen, setGuideModalOpen] = useState(false);
  const [isAiGuideModalOpen, setAiGuideModalOpen] = useState(false);
  const allShipsPlaced = totalRequiredShips > 0 && placedShipsCount === totalRequiredShips;

  return (
    <div className='ui-panel flex flex-col justify-between rounded-md p-3 sm:min-h-0'>
      {botSwitcher ? (
        <div className='relative z-10 mb-1'>{botSwitcher}</div>
      ) : null}
      {/* AI Difficulty Selector - only show when in bot mode */}
      {aiDifficulty && onAiDifficultyChange && (
        <div className='relative z-10 grid gap-2'>
          <div className='ui-subpanel rounded-sm px-3 py-2'>
            <div className='flex items-center justify-between gap-2 relative z-10 mb-2'>
              <p className='ui-panel-title'>
                {t('gameSetup.aiDifficulty.label')}
              </p>
              <Button
                onClick={() => setAiGuideModalOpen(true)}
                className='h-8! w-8! shrink-0 rounded-full px-0 text-base font-black normal-case tracking-normal'
                aria-label={t('gameSetup.aiDifficulty.openGuide')}
                title={t('gameSetup.aiDifficulty.openGuide')}
              >
                ?
              </Button>
            </div>
            <div className='grid grid-cols-1 gap-1 sm:grid-cols-3'>
              {difficultyOptions.map(
                (d) => (
                  <button
                    key={d}
                    type='button'
                    onClick={() => onAiDifficultyChange(d)}
                    className={`cursor-pointer ui-button-shell flex-1 rounded-sm border px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                      aiDifficulty === d
                        ? 'border-[rgba(117,235,255,0.95)] bg-[rgba(34,211,238,0.16)] text-(--text-main)'
                        : 'ui-state-idle text-(--text-muted) hover:text-(--text-main)'
                    }`}
                  >
                    {t(`gameSetup.aiDifficulty.${d}`)}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      <div className='relative z-10 grid gap-2'>
        <div className='ui-subpanel rounded-sm p-3'>
          <div className='flex items-center justify-between gap-2 relative z-10 mb-2'>
            <p className='ui-panel-title'>
              {t('gameSetup.placement.shipInstances')}
            </p>
            <Button
              onClick={() => setGuideModalOpen(true)}
              className='h-8! w-8! shrink-0 rounded-full px-0 text-base font-black normal-case tracking-normal'
              aria-label={t('gameSetup.placement.openGuide')}
              title={t('gameSetup.placement.openGuide')}
            >
              ?
            </Button>
          </div>

          {/* Ship Instances List */}
          <div className='themed-scrollbar max-h-57 space-y-2 overflow-y-auto pr-1 pb-1'>
            {shipInstances.map((instance) => {
              const key = instanceKey(
                instance.definitionId,
                instance.instanceIndex,
              );
              const placement = placementsByInstanceKey.get(key);
              const selected = selectedInstanceKey === key;

              return (
                <div
                  key={key}
                  role='button'
                  tabIndex={0}
                  onClick={() => onSelectInstance(key)}
                  onKeyDown={(e) => e.key === 'Enter' && onSelectInstance(key)}
                  className={`rounded-sm border px-3 py-2 text-xs ${
                    selected
                      ? 'border-[rgba(117,235,255,0.95)] bg-[rgba(34,211,238,0.12)]'
                      : 'ui-state-idle'
                  }`}
                >
                  <div className='flex items-start justify-between gap-2'>
                    <p className='truncate text-(--text-main) font-mono text-sm font-bold uppercase tracking-[0.08em]'>
                      {instance.name} #{instance.instanceIndex + 1}
                    </p>
                    {/* Delete Button */}
                    <Button
                      variant='danger'
                      disabled={!placement}
                      onClick={(e) => { e.stopPropagation(); onRemovePlaced(instance.definitionId, instance.instanceIndex); }}
                      className='h-6! w-16! shrink-0 rounded-sm px-2 text-[10px] tracking-[0.08em]'
                    >
                      {t('gameSetup.placement.remove')}
                    </Button>
                  </div>

                  <div className='mt-1 flex w-full items-center justify-between gap-1'>
                    <div className='flex items-center gap-1'>
                      {Array.from({ length: instance.size }).map((_, index) => (
                        <span
                          key={`${key}-${index}`}
                          className={`h-5 w-5 rounded-sm border ${
                            placement
                              ? 'border-[rgba(117,235,255,0.88)] bg-[rgba(34,211,238,0.3)]'
                              : 'border-[rgba(31,136,176,0.36)] bg-[rgba(2,14,24,0.88)]'
                          }`}
                        />
                      ))}
                      <span className='ml-1 flex items-center gap-1'>
                        {placement && (
                          <span className='text-[rgba(34,211,238,0.9)] text-xs leading-none'>✓</span>
                        )}
                        <span className='font-mono text-[9px] uppercase tracking-widest text-(--text-muted)'>
                          {placement
                            ? placement.orientation === 'horizontal'
                              ? t('gameSetup.placement.horizontal')
                              : t('gameSetup.placement.vertical')
                            : orientation === 'horizontal'
                              ? t('gameSetup.placement.horizontal')
                              : t('gameSetup.placement.vertical')}
                        </span>
                      </span>
                    </div>

                    {/* Rotate Button */}
                    <Button
                      onClick={(e) => { e.stopPropagation(); onRotate(key); }}
                      className='h-6! w-16! shrink-0 rounded-sm px-2 text-[10px] tracking-[0.08em]'
                    >
                      {t('gameSetup.placement.rotate')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`grid gap-2 ${onStrategicPlace ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <Button
              onClick={onRandomPlace}
              className='h-9 rounded-sm text-[10px] tracking-[0.12em]'
            >
              {t('gameSetup.placement.random')}
            </Button>
            {onStrategicPlace ? (
              <Button
                onClick={onStrategicPlace}
                className='h-9 rounded-sm text-[10px] tracking-[0.12em]'
              >
                Strategic
              </Button>
            ) : null}
            <Button
              variant='danger'
              onClick={onClearBoard}
              className='h-9 rounded-sm text-[10px] tracking-[0.12em]'
            >
              {t('gameSetup.placement.clear')}
            </Button>
          </div>
        </div>
      </div>

      {/* Start Checklist */}
      <div className='ui-subpanel rounded-sm px-3 py-3'>
        <p className='ui-data-label mb-2'>
          {t('gameSetup.placement.startChecklistTitle')}
        </p>
        <div className='space-y-1.5'>
          <p
            className={`text-xs ${allShipsPlaced ? 'text-(--accent-secondary)' : 'text-(--text-muted)'}`}
          >
            {allShipsPlaced ? '✓' : '○'}{' '}
            {t('gameSetup.placement.startChecklistShips', {
              placed: placedShipsCount,
              total: totalRequiredShips,
            })}
          </p>
          <p
            className={`text-xs ${isOpponentReady ? 'text-(--accent-secondary)' : 'text-(--text-muted)'}`}
          >
            {isOpponentReady ? '✓' : '○'}{' '}
            {opponentReadyLabel ?? t('gameSetup.placement.startChecklistOpponentReady')}
          </p>
          <p className={`text-xs ${hasError ? 'text-[#ffb4b4]' : 'text-(--text-muted)'}`}>
            {statusText}
          </p>
        </div>
      </div>

      {onPrimaryAction ? (
        <Button
          variant='primary'
          disabled={primaryActionDisabled}
          onClick={onPrimaryAction}
          className='h-10 rounded-sm text-[10px] tracking-[0.12em]'
        >
          {t('gameSetup.placement.primaryAction')}
        </Button>
      ) : null}

      <Modal
        isOpen={isGuideModalOpen}
        title={t('gameSetup.placement.guideTitle')}
        onClose={() => setGuideModalOpen(false)}
      >
        <div className='space-y-2 text-sm text-(--text-muted)'>
          <p>{t('gameSetup.placement.guideStep1')}</p>
          <p>{t('gameSetup.placement.guideStep2')}</p>
          <p>{t('gameSetup.placement.guideStep3')}</p>
        </div>
      </Modal>

      <Modal
        isOpen={isAiGuideModalOpen}
        title={t('gameSetup.aiDifficulty.guideTitle')}
        onClose={() => setAiGuideModalOpen(false)}
      >
        <div className='space-y-2 text-sm text-(--text-muted)'>
          <p>{t('gameSetup.aiDifficulty.guideRandom')}</p>
          <p>{t('gameSetup.aiDifficulty.guideLearning')}</p>
          <p>{t('gameSetup.aiDifficulty.guideProbability')}</p>
          <p>{t('gameSetup.aiDifficulty.guideLlm')}</p>
        </div>
      </Modal>
    </div>
  );
}
