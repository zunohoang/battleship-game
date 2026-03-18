import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import type {
  AiDifficulty,
  BoardConfig,
  Orientation,
  PlacedShip,
} from '@/types/game';
import type { ShipInstance } from '@/services/bots/core/shared/placementUtils';
import { instanceKey } from '@/services/bots/core/shared/placementUtils';

interface PlacementSidebarProps {
  shipInstances: ShipInstance[];
  placementsByInstanceKey: Map<string, PlacedShip>;
  selectedInstanceKey: string | null;
  boardConfig: BoardConfig;
  orientation: Orientation;
  placedShipsCount: number;
  totalRequiredShips: number;
  statusText: string;
  hasError: boolean;
  onSelectInstance: (key: string) => void;
  onRemovePlaced: (definitionId: string, instanceIndex: number) => void;
  onRandomPlace: () => void;
  onRotate: () => void;
  onClearBoard: () => void;
  aiDifficulty?: AiDifficulty;
  onAiDifficultyChange?: (d: AiDifficulty) => void;
}

export function PlacementSidebar({
  shipInstances,
  placementsByInstanceKey,
  selectedInstanceKey,
  boardConfig,
  orientation,
  placedShipsCount,
  totalRequiredShips,
  statusText,
  hasError,
  onSelectInstance,
  onRemovePlaced,
  onRandomPlace,
  onRotate,
  onClearBoard,
  aiDifficulty,
  onAiDifficultyChange,
}: PlacementSidebarProps) {
  const { t } = useTranslation();

  return (
    <div className="ui-panel flex flex-col gap-2 rounded-md p-3 sm:min-h-0">
      <div className="relative z-10 space-y-1">
        <p className="ui-panel-title">{t('gameSetup.header.step2Label')}</p>
        <p className="text-sm text-(--text-muted)">
          {t('gameSetup.step2.boardInfo', {
            rows: boardConfig.rows,
            cols: boardConfig.cols,
          })}
        </p>
      </div>

      <div className="relative z-10 grid gap-2">
        <p
          className={`text-xs ${hasError ? 'text-[#ffb4b4]' : 'text-(--text-muted)'}`}
        >
          {statusText}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="ui-subpanel flex-1 rounded-sm px-3 py-2">
            <p className="ui-data-label">{t('gameSetup.step2.deployment')}</p>
            <p className="mt-1 font-mono text-lg text-(--accent-secondary)">
              {placedShipsCount}/{totalRequiredShips}
            </p>
          </div>
          <div className="ui-subpanel flex-1 rounded-sm px-3 py-2">
            <p className="ui-data-label">
              {t('gameSetup.placement.orientation')}
            </p>
            <p className="mt-1 font-mono text-sm uppercase text-(--accent-secondary)">
              {orientation}
            </p>
          </div>
        </div>
        {aiDifficulty && onAiDifficultyChange && (
          <div className="ui-subpanel rounded-sm px-3 py-2">
            <p className="ui-data-label mb-2">
              {t('gameSetup.aiDifficulty.label')}
            </p>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
              {(['random', 'learning', 'probability'] as AiDifficulty[]).map(
                (d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onAiDifficultyChange(d)}
                    className={`ui-button-shell flex-1 rounded-sm border px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
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
        )}
      </div>

      <div className="relative z-10">
        <p className="ui-panel-title">
          {t('gameSetup.placement.shipInstances')}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-(--text-subtle)">
          {t('gameSetup.placement.hullDeployHint')}
        </p>
      </div>

      <div className="themed-scrollbar space-y-2 overflow-visible pr-1 sm:min-h-0 sm:flex-1 sm:overflow-y-auto">
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
              className={`rounded-sm border p-2.5 text-xs ${
                selected
                  ? 'border-[rgba(117,235,255,0.95)] bg-[rgba(34,211,238,0.12)]'
                  : 'ui-state-idle'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectInstance(key)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-(--text-main) font-mono text-sm font-bold uppercase tracking-[0.08em]">
                      {instance.name} #{instance.instanceIndex + 1}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-(--text-subtle)">
                      {t('gameSetup.placement.size')} {instance.size}
                      {' · '}
                      {placement
                        ? t('gameSetup.placement.placed')
                        : t('gameSetup.placement.notPlaced')}
                    </p>
                  </div>
                  <div className="flex gap-1 pt-0.5">
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
                  </div>
                </div>
              </button>

              {placement && (
                <Button
                  variant="danger"
                  onClick={() =>
                    onRemovePlaced(
                      instance.definitionId,
                      instance.instanceIndex,
                    )
                  }
                  className="mt-2 h-8 text-[10px] tracking-[0.12em]"
                >
                  {t('gameSetup.placement.remove')}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button
          onClick={onRandomPlace}
          className="h-9 rounded-sm text-[10px] tracking-[0.12em]"
        >
          {t('gameSetup.placement.random')}
        </Button>
        <Button
          onClick={onRotate}
          className="h-9 rounded-sm text-[10px] tracking-[0.12em]"
        >
          ROTATE
        </Button>
        <Button
          variant="danger"
          onClick={onClearBoard}
          className="h-9 rounded-sm text-[10px] tracking-[0.12em]"
        >
          {t('gameSetup.placement.clear')}
        </Button>
      </div>
    </div>
  );
}
