import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameSetup } from '@/store/gameSetupContext';
import { BOARD_PRESETS, CONFIG_LIMITS } from '@/constants/gameDefaults';
import { Button } from '@/components/ui/Button';
import { SectionStatus } from '@/components/ui/SectionStatus';
import { ShipPlacementStage } from '@/components/game-setup/ShipPlacementStage';
import type { GameMode, Orientation, ShipDefinition } from '@/types/game';

type LocationState = { mode?: GameMode };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function generateId() {
  return Math.random().toString(36).slice(2, 8);
}

interface StepPillProps {
    number: number;
    label: string;
  phaseLabel: string;
    status: 'active' | 'done' | 'upcoming';
}

function StepPill({ number, label, phaseLabel, status }: StepPillProps) {
  const active = status === 'active';
  const done = status === 'done';

  return (
    <motion.div
      layout
      className={`rounded-md border px-4 py-2 ${
        active
          ? 'border-[rgba(117,235,255,0.95)] bg-[rgba(34,211,238,0.16)] text-(--text-main) shadow-[0_0_18px_rgba(0,174,255,0.18)]'
          : done
            ? 'border-[rgba(63,203,232,0.48)] bg-[rgba(7,32,46,0.84)] text-(--accent-secondary)'
            : 'border-[rgba(31,136,176,0.36)] bg-[rgba(5,19,30,0.72)] text-(--text-muted)'
      }`}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className='flex items-center gap-3'>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-black ${
            active
              ? 'border-[rgba(117,235,255,0.92)] bg-[rgba(34,211,238,0.18)] text-(--text-main)'
              : done
                ? 'border-[rgba(63,203,232,0.48)] bg-[rgba(34,211,238,0.14)] text-(--accent-secondary)'
                : 'border-[rgba(31,136,176,0.36)] bg-transparent text-(--text-muted)'
          }`}
        >
          {done ? '✓' : number}
        </span>
        <div>
          <p className='ui-data-label'>{phaseLabel}</p>
          <p className='mt-1 text-sm font-bold uppercase tracking-[0.08em]'>
            {label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function GameSetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const mode = (location.state as LocationState | null)?.mode ?? 'bot';

  const {
    state,
    setBoardConfig,
    setPlacements,
    addShipDefinition,
    updateShipDefinition,
    removeShipDefinition,
    clearPlacements,
    setReady,
    resetConfig,
  } = useGameSetup();

  const [step, setStep] = useState<1 | 2>(1);
  const [placementOrientation, setPlacementOrientation] = useState<Orientation>('horizontal');
  const [newShipName, setNewShipName] = useState('');
  const [newShipSize, setNewShipSize] = useState(3);
  const [newShipCount, setNewShipCount] = useState(1);

  const { boardConfig, ships } = state.config;

  const handleBoardPreset = (rows: number, cols: number) => {
    setBoardConfig({ rows, cols });
  };

  const handleAddShip = useCallback(() => {
    const name = newShipName.trim();
    if (!name) return;
    addShipDefinition({
      id: generateId(),
      name,
      size: newShipSize,
      count: newShipCount,
    });
    setNewShipName('');
    setNewShipSize(3);
    setNewShipCount(1);
  }, [addShipDefinition, newShipCount, newShipName, newShipSize]);

  const handleShipField = (
    id: string,
    field: keyof Omit<ShipDefinition, 'id'>,
    raw: string,
  ) => {
    if (field === 'name') {
      updateShipDefinition(id, { name: raw });
      return;
    }

    const val = parseInt(raw, 10);
    if (Number.isNaN(val)) return;

    if (field === 'size') {
      updateShipDefinition(id, {
        size: clamp(
          val,
          CONFIG_LIMITS.ship.minSize,
          CONFIG_LIMITS.ship.maxSize,
        ),
      });
    }

    if (field === 'count') {
      updateShipDefinition(id, {
        count: clamp(
          val,
          CONFIG_LIMITS.ship.minCount,
          CONFIG_LIMITS.ship.maxCount,
        ),
      });
    }
  };

  const handleNext = () => {
    clearPlacements();
    setPlacementOrientation('horizontal');
    setStep(2);
  };

  const handleBackToConfig = () => {
    clearPlacements();
    setPlacementOrientation('horizontal');
    setStep(1);
  };

  const totalCells = ships.reduce((sum, ship) => sum + ship.size * ship.count, 0);
  const boardCells = boardConfig.rows * boardConfig.cols;
  const isConfigValid = ships.length > 0 && totalCells <= boardCells * 0.5;
  const requiredShipCount = useMemo(
    () => ships.reduce((total, ship) => total + ship.count, 0),
    [ships],
  );
  const allShipsPlaced =
        requiredShipCount > 0 && state.placements.length === requiredShipCount;
  useEffect(() => {
    setReady(allShipsPlaced);
  }, [allShipsPlaced, setReady]);

  const inputCls = 'ui-input h-8 w-full rounded-sm px-3 text-sm';
  const labelCls =
      'grid gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--text-muted)';
  const panelTitleCls = 'ui-panel-title';

  return (
    <motion.main
      className='relative h-screen overflow-hidden px-3 py-3 text-(--text-main) sm:px-6 sm:py-4'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className='ui-page-bg -z-20' />
      <div className='absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(50,217,255,0.08),transparent_42%)]' />

      <section className='ui-hud-shell mx-auto flex h-full w-full max-w-7xl min-h-0 flex-col rounded-md p-3 sm:p-4'>
        <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center'>
          <div className='ui-panel ui-panel-glow flex items-center rounded-md px-5 py-3'>
            <div className='relative z-10 flex min-w-0 flex-1 flex-wrap items-center gap-4'>
              <div className='text-(--accent-secondary) flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(117,235,255,0.95)] bg-[rgba(34,211,238,0.12)] font-mono text-lg font-black'>
                C
              </div>
              <div className='min-w-0 flex-1'>
                <p className='truncate font-mono text-base font-black uppercase tracking-widest text-(--accent-secondary) sm:text-lg'>
                  {t('gameSetup.header.commanderName')}
                </p>
                <h1 className='truncate font-mono text-xs font-semibold uppercase tracking-[0.2em] text-(--text-muted) sm:text-xs'>
                  {step === 1
                    ? t('gameSetup.header.title_fleet')
                    : t('gameSetup.header.title_placement')}
                </h1>
              </div>
            </div>
            <div className='ml-4 whitespace-nowrap text-right'>
              {t(`gameSetup.header.modes.${mode}`)}
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2 lg:justify-end'>
            <StepPill
              number={1}
              label={t('gameSetup.header.step1Label')}
              phaseLabel={t('gameSetup.header.phase')}
              status={step > 1 ? 'done' : 'active'}
            />
            <div className='hidden h-px w-8 bg-[rgba(63,203,232,0.48)] lg:block' />
            <StepPill
              number={2}
              label={t('gameSetup.header.step2Label')}
              phaseLabel={t('gameSetup.header.phase')}
              status={step === 2 ? 'active' : 'upcoming'}
            />
            <Button
              onClick={() =>
                step === 2 ? handleBackToConfig() : navigate('/home')
              }
              className='h-10 px-4 sm:w-auto'
            >
              {t('gameSetup.header.back')}
            </Button>
            {step === 2 ? (
              <Button
                variant='primary'
                disabled={!allShipsPlaced}
                onClick={() =>
                  navigate('/game/play', {
                    state: {
                      mode,
                      config: state.config,
                      placements: state.placements,
                    },
                  })
                }
                className='h-10 px-4 sm:w-auto sm:min-w-52'
              >
                {t('gameSetup.header.startGame')}
              </Button>
            ) : null}
          </div>
        </div>

        <div className='mt-3 min-h-0 flex-1 overflow-hidden'>
          <AnimatePresence mode='wait'>
            {step === 1 ? (
              <motion.div
                key='fleet'
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className='grid h-full min-h-0 gap-4 overflow-hidden xl:grid-cols-[360px_minmax(0,1fr)]'
              >
                <section className='ui-panel themed-scrollbar min-h-0 overflow-y-auto rounded-md p-5'>
                  <div className='relative z-10 flex min-h-full flex-col gap-5'>
                    <div>
                      <p className={panelTitleCls}>
                        {t('gameSetup.step1.boardSizeTitle')}
                      </p>
                      <p className='mt-2 text-sm leading-6 text-(--text-muted)'>
                        {t('gameSetup.step1.configureGridHint')}
                      </p>
                    </div>

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
                              handleBoardPreset(
                                preset.value.rows,
                                preset.value.cols,
                              )
                            }
                            className={`ui-button-shell rounded-md border px-4 py-3 text-left transition-colors ${
                              active
                                ? 'border-[rgba(117,235,255,0.95)] bg-[rgba(34,211,238,0.16)] text-(--text-main)'
                                : 'border-[rgba(31,136,176,0.36)] bg-[rgba(5,19,30,0.72)] text-(--text-muted) hover:text-(--text-main)'
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

                    <div className='grid gap-4 rounded-sm border border-[rgba(31,136,176,0.36)] bg-black/10 px-4 py-4'>
                      <div>
                        <p className='ui-data-label'>{t('gameSetup.step1.deploymentCapacity')}</p>
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
                        <div className='rounded-sm border border-[rgba(31,136,176,0.3)] bg-[rgba(1,11,18,0.6)] px-3 py-3'>
                          <p className='ui-data-label'>{t('gameSetup.step1.fleetLoad')}</p>
                          <p className='mt-1 font-mono text-lg text-(--text-main)'>
                            {totalCells}
                          </p>
                        </div>
                        <div className='rounded-sm border border-[rgba(31,136,176,0.3)] bg-[rgba(1,11,18,0.6)] px-3 py-3'>
                          <p className='ui-data-label'>{t('gameSetup.step1.limit')}</p>
                          <p className='mt-1 font-mono text-lg text-(--text-main)'>
                            {Math.floor(boardCells * 0.5)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className='ui-panel ui-panel-strong themed-scrollbar min-h-0 rounded-md p-5'>
                  <div className='relative z-10 flex h-full min-h-0 flex-col gap-4'>
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div>
                        <p className={panelTitleCls}>
                          {t('gameSetup.step1.fleetTitle')}
                        </p>
                        <p className='mt-2 text-sm leading-6 text-(--text-muted)'>
                          {t('gameSetup.step1.totalCellsInfo', {
                            used: totalCells,
                            max: Math.floor(boardCells * 0.5),
                          })}
                        </p>
                      </div>
                      <div className='rounded-sm border border-[rgba(31,136,176,0.36)] bg-black/10 px-4 py-2'>
                        <p className='ui-data-label'>{t('gameSetup.step1.fleetTypes')}</p>
                        <p className='mt-1 font-mono text-lg text-(--accent-secondary)'>
                          {ships.length}
                        </p>
                      </div>
                    </div>

                    {ships.length === 0 ? (
                      <div className='rounded-sm border border-[rgba(141,63,71,0.62)] bg-[rgba(43,16,22,0.82)] px-4 py-4 text-sm font-semibold text-[#ffb4b4]'>
                        {t('gameSetup.step1.noShips')}
                      </div>
                    ) : null}

                    <div className='themed-scrollbar grid min-h-0 flex-1 gap-1 overflow-y-auto pr-1'>
                      {ships.map((ship) => (
                        <div
                          key={ship.id}
                          className='rounded-sm border border-[rgba(31,136,176,0.36)] bg-[rgba(5,19,30,0.72)] px-4 py-2'
                        >
                          <div className='grid gap-3 xl:grid-cols-[minmax(0,1fr)_96px_96px_auto] xl:items-end'>
                            <label className={labelCls}>
                              {t('gameSetup.step1.shipName')}
                              <input
                                type='text'
                                value={ship.name}
                                onChange={(event) =>
                                  handleShipField(
                                    ship.id,
                                    'name',
                                    event.target.value,
                                  )
                                }
                                className={`${inputCls} font-semibold`}
                              />
                            </label>
                            <label className={labelCls}>
                              {t('gameSetup.step1.size')}
                              <input
                                type='number'
                                min={CONFIG_LIMITS.ship.minSize}
                                max={CONFIG_LIMITS.ship.maxSize}
                                value={ship.size}
                                onChange={(event) =>
                                  handleShipField(
                                    ship.id,
                                    'size',
                                    event.target.value,
                                  )
                                }
                                className={inputCls}
                              />
                            </label>
                            <label className={labelCls}>
                              {t('gameSetup.step1.count')}
                              <input
                                type='number'
                                min={CONFIG_LIMITS.ship.minCount}
                                max={CONFIG_LIMITS.ship.maxCount}
                                value={ship.count}
                                onChange={(event) =>
                                  handleShipField(
                                    ship.id,
                                    'count',
                                    event.target.value,
                                  )
                                }
                                className={inputCls}
                              />
                            </label>
                            <Button
                              variant='danger'
                              onClick={() => removeShipDefinition(ship.id)}
                              className='h-10 px-2 xl:w-auto text-[10px]'
                            >
                              {t('gameSetup.step1.removeButton')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {ships.length < CONFIG_LIMITS.ship.maxShipTypes ? (
                      <div className='rounded-sm border border-dashed border-[rgba(63,203,232,0.48)] bg-[rgba(7,32,46,0.4)] px-4 py-2'>
                        <div className='grid gap-3 xl:grid-cols-[minmax(0,1fr)_96px_96px_auto] xl:items-end'>
                          <label className={labelCls}>
                            {t('gameSetup.step1.shipName')}
                            <input
                              type='text'
                              placeholder={t('gameSetup.step1.namePlaceholder')}
                              value={newShipName}
                              onChange={(event) =>
                                setNewShipName(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  handleAddShip();
                                }
                              }}
                              className={inputCls}
                            />
                          </label>
                          <label className={labelCls}>
                            {t('gameSetup.step1.size')}
                            <input
                              type='number'
                              min={CONFIG_LIMITS.ship.minSize}
                              max={CONFIG_LIMITS.ship.maxSize}
                              value={newShipSize}
                              onChange={(event) =>
                                setNewShipSize(
                                  clamp(
                                    parseInt(event.target.value, 10),
                                    CONFIG_LIMITS.ship.minSize,
                                    CONFIG_LIMITS.ship.maxSize,
                                  ),
                                )
                              }
                              className={inputCls}
                            />
                          </label>
                          <label className={labelCls}>
                            {t('gameSetup.step1.count')}
                            <input
                              type='number'
                              min={1}
                              max={CONFIG_LIMITS.ship.maxCount}
                              value={newShipCount}
                              onChange={(event) =>
                                setNewShipCount(
                                  clamp(
                                    parseInt(event.target.value, 10),
                                    1,
                                    CONFIG_LIMITS.ship.maxCount,
                                  ),
                                )
                              }
                              className={inputCls}
                            />
                          </label>
                          <Button
                            variant='primary'
                            onClick={handleAddShip}
                            disabled={!newShipName.trim()}
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
                          onClick={resetConfig}
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
                        disabled={!isConfigValid}
                        onClick={handleNext}
                        className='h-8 px-4 sm:w-auto'
                      >
                        {t('gameSetup.header.nextStep')}
                      </Button>
                    </div>
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div
                key='placement'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                className='grid h-full min-h-0 gap-3 overflow-hidden'
              >
                <section className='ui-panel ui-panel-strong themed-scrollbar flex min-h-0 flex-col rounded-md p-4'>
                  <div className='min-h-0 flex-1'>
                    <ShipPlacementStage
                      boardConfig={boardConfig}
                      ships={ships}
                      placements={state.placements}
                      orientation={placementOrientation}
                      onOrientationChange={setPlacementOrientation}
                      onPlacementsChange={setPlacements}
                    />
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <SectionStatus
          className='mt-3'
          leftText={t('gameSetup.header.systemLogWaiting')}
          rightText={
            allShipsPlaced
              ? t('gameSetup.header.secureLinkEstablished')
              : t('gameSetup.header.secureLinkPending')
          }
        />
      </section>
    </motion.main>
  );
}