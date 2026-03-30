import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BOARD_PRESETS,
  CONFIG_LIMITS,
  TURN_TIMER_OPTIONS,
} from '@/constants/gameDefaults';
import { Button } from '@/components/ui/Button';
import { NumberStepper } from '@/components/ui/NumberStepper';
import type { BoardConfig, ShipDefinition } from '@/types/game';

interface Phase1SetupStageProps {
  boardConfig: BoardConfig;
  ships: ShipDefinition[];
  turnTimerSeconds: number;
  isConfigValid: boolean;
  canAdjustTurnTimer: boolean;
  continueDisabled: boolean;
  continueLabel: string;
  onBoardPreset: (rows: number, cols: number) => void;
  onTurnTimerChange: (seconds: number) => void;
  onShipAdd: (ship: ShipDefinition) => void;
  onShipUpdate: (
    id: string,
    patch: Partial<Omit<ShipDefinition, 'id'>>,
  ) => void;
  onShipRemove: (id: string) => void;
  onReset: () => void;
  onContinue: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function Phase1SetupStage({
  boardConfig,
  ships,
  turnTimerSeconds,
  isConfigValid,
  canAdjustTurnTimer,
  continueDisabled,
  continueLabel,
  onBoardPreset,
  onTurnTimerChange,
  onShipAdd,
  onShipUpdate,
  onShipRemove,
  onReset,
  onContinue,
}: Phase1SetupStageProps) {
  const { t } = useTranslation();

  // Local state for new ship form
  const [newShipName, setNewShipName] = useState('');
  const [newShipSize, setNewShipSize] = useState(3);
  const [newShipCount, setNewShipCount] = useState(1);

  // Derived values
  const boardCells = boardConfig.rows * boardConfig.cols;
  const fleetCellLimit = Math.floor(boardCells * 0.5);
  const totalCells = ships.reduce(
    (sum, ship) => sum + ship.size * ship.count,
    0,
  );
  const turnTimerOptionIndex = TURN_TIMER_OPTIONS.findIndex(
    (value) => value === turnTimerSeconds,
  );
  const canDecreaseTurnTimer = canAdjustTurnTimer && turnTimerOptionIndex > 0;
  const canIncreaseTurnTimer =
    canAdjustTurnTimer &&
    turnTimerOptionIndex >= 0 &&
    turnTimerOptionIndex < TURN_TIMER_OPTIONS.length - 1;
  const canFitFleetLoad = (nextTotalCells: number) =>
    nextTotalCells <= fleetCellLimit;
  const canFitNewShipDraft = (size: number, count: number) =>
    canFitFleetLoad(totalCells + size * count);
  const canAddShipDraft =
    newShipName.trim().length > 0 &&
    canFitNewShipDraft(newShipSize, newShipCount);

  const handleShipNumericChange = (
    id: string,
    field: 'size' | 'count',
    value: number,
  ) => {
    if (field === 'size') {
      onShipUpdate(id, {
        size: clamp(
          value,
          CONFIG_LIMITS.ship.minSize,
          CONFIG_LIMITS.ship.maxSize,
        ),
      });
    }

    if (field === 'count') {
      onShipUpdate(id, {
        count: clamp(
          value,
          CONFIG_LIMITS.ship.minCount,
          CONFIG_LIMITS.ship.maxCount,
        ),
      });
    }
  };

  const handleAddShip = () => {
    const name = newShipName.trim();
    if (!name) {
      return;
    }

    onShipAdd({
      id: Math.random().toString(36).slice(2, 8),
      name,
      size: newShipSize,
      count: newShipCount,
    });
    setNewShipName('');
    setNewShipSize(3);
    setNewShipCount(1);
  };

  return (
    <div className='grid content-start gap-4 overflow-visible h-full sm:overflow-hidden xl:grid-cols-[360px_minmax(0,1fr)]'>
      {/* Left panel */}
      <section className='ui-panel themed-scrollbar overflow-visible rounded-md p-5 sm:overflow-y-auto h-full'>
        <div className='relative z-10 flex min-h-full flex-col gap-5'>
          <div>
            <p className='ui-panel-title'>
              {t('gameSetup.step1.boardSizeTitle')}
            </p>
            <p className='mt-2 text-sm leading-6 text-(--text-muted)'>
              {t('gameSetup.step1.configureGridHint')}
            </p>
          </div>

          {/* Board size */}
          <div className='grid gap-3'>
            {BOARD_PRESETS.map((preset) => {
              const active =
                boardConfig.rows === preset.value.rows &&
                boardConfig.cols === preset.value.cols;

              return (
                <button
                  key={preset.label}
                  type='button'
                  onClick={() =>
                    onBoardPreset(preset.value.rows, preset.value.cols)
                  }
                  className={`cursor-pointer ui-button-shell rounded-md border px-4 py-3 text-left transition-colors ${
                    active
                      ? 'border-[rgba(117,235,255,0.95)] bg-[rgba(34,211,238,0.16)] text-(--text-main)'
                      : 'ui-state-idle text-(--text-muted) hover:text-(--text-main)'
                  }`}
                >
                  <p className='font-mono text-sm font-bold uppercase tracking-[0.18em]'>
                    {preset.label}
                  </p>
                  <p className='mt-1 text-xs uppercase tracking-[0.18em] text-(--text-subtle)'>
                    {t('gameSetup.step1.presetSize', {
                      rows: preset.value.rows,
                      cols: preset.value.cols,
                    })}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Specs */}
          <div className='ui-subpanel grid gap-4 rounded-sm px-4 py-4'>
            <div>
              <p className='ui-data-label'>
                {t('gameSetup.step1.deploymentCapacity')}
              </p>
              <p className='mt-2 text-3xl font-black text-(--accent-secondary)'>
                {boardCells}
              </p>
              <p className='mt-2 text-sm text-(--text-muted)'>
                {t('gameSetup.step1.boardInfo', {
                  rows: boardConfig.rows,
                  cols: boardConfig.cols,
                  cells: boardCells,
                })}
              </p>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='ui-subpanel-strong rounded-sm px-3 py-3'>
                <p className='ui-data-label'>{t('gameSetup.step1.limit')}</p>
                <p className='mt-1 font-mono text-lg text-(--text-main)'>
                  {fleetCellLimit}
                </p>
              </div>
              <div className='ui-subpanel-strong rounded-sm px-3 py-3'>
                <p className='ui-data-label'>
                  {t('gameSetup.step1.fleetLoad')}
                </p>
                <p className='mt-1 font-mono text-lg text-(--text-main)'>
                  {totalCells}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right panel */}
      <section className='ui-panel ui-panel-strong themed-scrollbar overflow-visible rounded-md p-5 h-full sm:overflow-y-auto'>
        <div className='relative z-10 flex h-full min-h-0 flex-col gap-4'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <p className='ui-panel-title'>
                {t('gameSetup.step1.fleetTitle')}
              </p>
              <p className='mt-2 text-sm leading-6 text-(--text-muted)'>
                {t('gameSetup.step1.totalCellsInfo', {
                  used: totalCells,
                  max: fleetCellLimit,
                })}
              </p>
            </div>

            <div className='flex flex-wrap items-start gap-3'>
              {/* Turn timer controls */}
              <div className='ui-subpanel rounded-sm px-4 py-2'>
                <p className='ui-data-label'>
                  {t('gameSetup.step1.turnTimer')}
                </p>
                <div className='mt-1 flex items-center gap-2'>
                  <Button
                    className='px-2'
                    disabled={!canDecreaseTurnTimer}
                    onClick={() => {
                      onTurnTimerChange(
                        TURN_TIMER_OPTIONS[turnTimerOptionIndex - 1],
                      );
                    }}
                  >
                    -
                  </Button>
                  <p className='min-w-14 text-center font-mono text-lg text-(--accent-secondary)'>
                    {t('gameSetup.step1.turnTimerValue', {
                      seconds: turnTimerSeconds,
                    })}
                  </p>
                  <Button
                    className='px-2'
                    disabled={!canIncreaseTurnTimer}
                    onClick={() => {
                      onTurnTimerChange(
                        TURN_TIMER_OPTIONS[turnTimerOptionIndex + 1],
                      );
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Fleet types count */}
              <div className='ui-subpanel rounded-sm px-4 py-2'>
                <p className='ui-data-label'>
                  {t('gameSetup.step1.fleetTypes')}
                </p>
                <p className='mt-1 justify-self-center font-mono text-5xl text-(--accent-secondary)'>
                  {ships.length}
                </p>
              </div>
            </div>
          </div>

          {/* No list noti */}
          {ships.length === 0 ? (
            <div className='rounded-sm border border-[rgba(141,63,71,0.62)] bg-[rgba(43,16,22,0.82)] px-4 py-4 text-sm font-semibold text-[#ffb4b4]'>
              {t('gameSetup.step1.noShips')}
            </div>
          ) : null}

          <div className='themed-scrollbar grid min-h-0 flex-1 gap-1 overflow-y-auto pr-1'>
            {ships.map((ship) => (
              <div key={ship.id} className='ui-state-idle rounded-sm px-4 py-2'>
                <div className='grid gap-3 xl:grid-cols-[minmax(0,1fr)_112px_112px_auto] xl:items-end'>
                  <label className='grid gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--text-muted)'>
                    {t('gameSetup.step1.shipName')}
                    <input
                      type='text'
                      value={ship.name}
                      onChange={(event) =>
                        onShipUpdate(ship.id, { name: event.target.value })
                      }
                      className='ui-input h-8 w-full rounded-sm px-3 text-sm font-semibold'
                    />
                  </label>
                  <label className='grid gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--text-muted)'>
                    {t('gameSetup.step1.size')}
                    <NumberStepper
                      value={ship.size}
                      min={CONFIG_LIMITS.ship.minSize}
                      max={CONFIG_LIMITS.ship.maxSize}
                      disableIncrease={
                        !canFitFleetLoad(totalCells + ship.count)
                      }
                      onChange={(value) =>
                        handleShipNumericChange(ship.id, 'size', value)
                      }
                      className='h-8 w-full rounded-sm'
                      valueClassName='text-sm'
                      decrementLabel={`Decrease ${ship.name} size`}
                      incrementLabel={`Increase ${ship.name} size`}
                    />
                  </label>
                  <label className='grid gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--text-muted)'>
                    {t('gameSetup.step1.count')}
                    <NumberStepper
                      value={ship.count}
                      min={CONFIG_LIMITS.ship.minCount}
                      max={CONFIG_LIMITS.ship.maxCount}
                      disableIncrease={!canFitFleetLoad(totalCells + ship.size)}
                      onChange={(value) =>
                        handleShipNumericChange(ship.id, 'count', value)
                      }
                      className='h-8 w-full rounded-sm'
                      valueClassName='text-sm'
                      decrementLabel={`Decrease ${ship.name} count`}
                      incrementLabel={`Increase ${ship.name} count`}
                    />
                  </label>
                  <Button
                    variant='danger'
                    onClick={() => onShipRemove(ship.id)}
                    className='h-10 px-2 text-[10px] xl:w-auto'
                  >
                    {t('gameSetup.step1.removeButton')}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {ships.length < CONFIG_LIMITS.ship.maxShipTypes ? (
            <div className='ui-subpanel rounded-sm border-dashed border-[rgba(63,203,232,0.48)] px-4 py-2'>
              <div className='grid gap-3 xl:grid-cols-[minmax(0,1fr)_112px_112px_auto] xl:items-end'>
                <label className='grid gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--text-muted)'>
                  {t('gameSetup.step1.shipName')}
                  <input
                    type='text'
                    placeholder={t('gameSetup.step1.namePlaceholder')}
                    value={newShipName}
                    onChange={(event) => setNewShipName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleAddShip();
                      }
                    }}
                    className='ui-input h-8 w-full rounded-sm px-3 text-sm'
                  />
                </label>
                <label className='grid gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--text-muted)'>
                  {t('gameSetup.step1.size')}
                  <NumberStepper
                    value={newShipSize}
                    min={CONFIG_LIMITS.ship.minSize}
                    max={CONFIG_LIMITS.ship.maxSize}
                    disableIncrease={
                      !canFitNewShipDraft(newShipSize + 1, newShipCount)
                    }
                    onChange={setNewShipSize}
                    className='h-8 w-full rounded-sm'
                    valueClassName='text-sm'
                    decrementLabel='Decrease ship size'
                    incrementLabel='Increase ship size'
                  />
                </label>
                <label className='grid gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--text-muted)'>
                  {t('gameSetup.step1.count')}
                  <NumberStepper
                    value={newShipCount}
                    min={1}
                    max={CONFIG_LIMITS.ship.maxCount}
                    disableIncrease={
                      !canFitNewShipDraft(newShipSize, newShipCount + 1)
                    }
                    onChange={setNewShipCount}
                    className='h-8 w-full rounded-sm'
                    valueClassName='text-sm'
                    decrementLabel='Decrease ship count'
                    incrementLabel='Increase ship count'
                  />
                </label>
                <Button
                  variant='primary'
                  onClick={handleAddShip}
                  disabled={!canAddShipDraft}
                  className='h-8 px-2 xl:w-auto'
                >
                  {t('gameSetup.step1.addButton')}
                </Button>
              </div>
            </div>
          ) : null}

          <div className='flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(31,136,176,0.28)] pt-2'>
            <div className='flex flex-wrap items-center gap-3'>
              <Button
                variant='danger'
                onClick={onReset}
                className='h-8 px-4 sm:w-auto'
              >
                {t('gameSetup.step1.resetButton')}
              </Button>
              {!isConfigValid && ships.length > 0 ? (
                <p className='text-sm font-semibold text-[#ffb4b4]'>
                  {t('gameSetup.step1.invalidFleetError')}
                </p>
              ) : null}
            </div>
            <Button
              variant='primary'
              disabled={continueDisabled}
              onClick={onContinue}
              className='h-8 px-4 sm:w-auto'
            >
              {continueLabel}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
