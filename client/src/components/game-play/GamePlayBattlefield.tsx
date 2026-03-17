import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { images } from '@/assets';
import { GAME_PLAY_BOARD_RENDER } from '@/constants/gamePlayBoard';
import type {
  BoardConfig,
  PlacedShip,
  ShipDefinition,
  Shot,
} from '@/types/game';
import { buildOccupiedMap, cellKey, instanceKey } from '@/utils/placementUtils';
import {
  extractShipSpriteSheetMeta,
  getShipSpriteStyle,
  toSpriteDirectionFromPlacement,
  type ShipSpriteSheetMeta,
  type ShipSpriteSize,
} from '@/utils/shipSpriteSheet';

type PanelTone = 'friendly' | 'hostile';

interface BattleBoardProps {
  boardConfig: BoardConfig;
  ships: ShipDefinition[];
  placements: PlacedShip[];
  shots: Shot[];
  onFire?: (x: number, y: number) => void;
  isActive?: boolean;
  revealShips?: boolean;
}

interface BattleBoardPanelProps {
  tone: PanelTone;
  title: string;
  headerAside?: ReactNode;
  boardProps: BattleBoardProps;
  overlay?: ReactNode;
  rootClassName?: string;
  panelClassName?: string;
  mobileHeaderPosition?: 'top' | 'bottom';
  desktopHeaderAlign?: 'left' | 'right';
}

function toShipSpriteSize(size: number): ShipSpriteSize | null {
  if (size >= 1 && size <= 5) {
    return size as ShipSpriteSize;
  }

  return null;
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

function getToneClasses(tone: PanelTone) {
  if (tone === 'hostile') {
    return 'bg-[rgba(255,120,80,0.8)] shadow-[0_0_6px_rgba(255,120,80,0.35)]';
  }

  return 'bg-[rgba(34,211,238,0.8)] shadow-[0_0_6px_rgba(34,211,238,0.35)]';
}

function BattleBoard({
  boardConfig,
  ships,
  placements,
  shots,
  onFire,
  isActive = false,
  revealShips = false,
}: BattleBoardProps) {
  const boardViewportRef = useRef<HTMLDivElement | null>(null);
  const [cellSize, setCellSize] = useState<number>(
    GAME_PLAY_BOARD_RENDER.initialCellSize,
  );
  const [spriteMeta, setSpriteMeta] = useState<ShipSpriteSheetMeta | null>(null);

  const shipsById = useMemo(
    () => new Map(ships.map((ship) => [ship.id, ship])),
    [ships],
  );
  const occupiedMap = useMemo(
    () => buildOccupiedMap(placements, shipsById),
    [placements, shipsById],
  );
  const shotMap = useMemo(
    () => new Map(shots.map((shot) => [cellKey(shot.x, shot.y), shot])),
    [shots],
  );

  useEffect(() => {
    let cancelled = false;

    extractShipSpriteSheetMeta(images.battleShipSheet)
      .then((meta) => {
        if (!cancelled) {
          setSpriteMeta(meta);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSpriteMeta(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const element = boardViewportRef.current;
    if (!element) {
      return;
    }

    const updateCellSize = () => {
      const nextCellSize = Math.floor(
        Math.min(
          (
            element.clientWidth -
            GAME_PLAY_BOARD_RENDER.axisAllowance -
            (boardConfig.cols - 1) * GAME_PLAY_BOARD_RENDER.defaultCellGap
          ) / boardConfig.cols,
          (
            element.clientHeight -
            GAME_PLAY_BOARD_RENDER.axisAllowance -
            (boardConfig.rows - 1) * GAME_PLAY_BOARD_RENDER.defaultCellGap
          ) / boardConfig.rows,
        ),
      );

      setCellSize(Math.max(GAME_PLAY_BOARD_RENDER.minCellSize, nextCellSize));
    };

    updateCellSize();

    const observer = new ResizeObserver(updateCellSize);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [boardConfig.cols, boardConfig.rows]);

  const isCompactBoard = cellSize <= GAME_PLAY_BOARD_RENDER.compactThreshold;
  const cellGap = isCompactBoard
    ? GAME_PLAY_BOARD_RENDER.compactCellGap
    : GAME_PLAY_BOARD_RENDER.defaultCellGap;
  const axisSize = isCompactBoard
    ? GAME_PLAY_BOARD_RENDER.compactAxisSize
    : GAME_PLAY_BOARD_RENDER.defaultAxisSize;
  const boardOffsetX = axisSize + cellGap;
  const boardOffsetY = axisSize + cellGap;
  const boardPixelWidth =
    boardConfig.cols * cellSize + (boardConfig.cols - 1) * cellGap;
  const boardPixelHeight =
    boardConfig.rows * cellSize + (boardConfig.rows - 1) * cellGap;
  const fullPixelWidth = boardOffsetX + boardPixelWidth;
  const fullPixelHeight = boardOffsetY + boardPixelHeight;

  const boardStyle = {
    gridTemplateColumns: `repeat(${boardConfig.cols}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${boardConfig.rows}, ${cellSize}px)`,
    gap: `${cellGap}px`,
  };
  const axisColumnStyle = {
    gridTemplateColumns: `repeat(${boardConfig.cols}, ${cellSize}px)`,
    gap: `${cellGap}px`,
  };
  const axisRowStyle = {
    gridTemplateRows: `repeat(${boardConfig.rows}, ${cellSize}px)`,
    gap: `${cellGap}px`,
  };

  const placedShipSprites = revealShips
    ? placements
      .map((placement) => {
        const ship = shipsById.get(placement.definitionId);
        if (!ship) {
          return null;
        }

        const spriteSize = toShipSpriteSize(ship.size);
        const renderWidth =
          placement.orientation === 'horizontal'
            ? ship.size * cellSize + (ship.size - 1) * cellGap
            : cellSize;
        const renderHeight =
          placement.orientation === 'vertical'
            ? ship.size * cellSize + (ship.size - 1) * cellGap
            : cellSize;

        const baseStyle = {
          left: `${placement.x * (cellSize + cellGap)}px`,
          top: `${placement.y * (cellSize + cellGap)}px`,
          width: `${renderWidth}px`,
          height: `${renderHeight}px`,
        };

        const spriteStyle =
          spriteMeta && spriteSize
            ? getShipSpriteStyle(
              images.battleShipSheet,
              spriteMeta,
              toSpriteDirectionFromPlacement(placement.orientation),
              spriteSize,
              renderWidth,
              renderHeight,
            )
            : null;

        return {
          key: instanceKey(placement.definitionId, placement.instanceIndex),
          ship,
          baseStyle,
          spriteStyle,
        };
      })
      .filter((sprite): sprite is NonNullable<typeof sprite> => sprite !== null)
    : [];

  return (
    <div ref={boardViewportRef} className='h-full w-full overflow-hidden'>
      <div className='flex h-full w-full items-center justify-center'>
        <div
          className='relative'
          style={{ width: `${fullPixelWidth}px`, height: `${fullPixelHeight}px` }}
        >
          <div
            className='absolute grid text-center font-mono text-[10px] font-bold text-(--text-subtle)'
            style={{
              ...axisColumnStyle,
              left: `${boardOffsetX}px`,
              top: 0,
              height: `${axisSize}px`,
              lineHeight: `${axisSize}px`,
            }}
          >
            {Array.from({ length: boardConfig.cols }).map((_, x) => (
              <div key={`col-${x}`}>{toColumnLabel(x)}</div>
            ))}
          </div>

          <div
            className='absolute grid text-center font-mono text-[10px] font-bold text-(--text-subtle)'
            style={{
              ...axisRowStyle,
              left: 0,
              top: `${boardOffsetY}px`,
              width: `${axisSize}px`,
            }}
          >
            {Array.from({ length: boardConfig.rows }).map((_, y) => (
              <div
                key={`row-${y}`}
                style={{ height: `${cellSize}px`, lineHeight: `${cellSize}px` }}
              >
                {y + 1}
              </div>
            ))}
          </div>

          <div
            className='absolute grid'
            style={{
              ...boardStyle,
              left: `${boardOffsetX}px`,
              top: `${boardOffsetY}px`,
            }}
          >
            {Array.from({ length: boardConfig.rows }).map((_, y) =>
              Array.from({ length: boardConfig.cols }).map((__, x) => {
                const key = cellKey(x, y);
                const shot = shotMap.get(key);
                const alreadyShot = shot !== undefined;
                const canFire = isActive && !alreadyShot && !!onFire;

                let cellClassName = 'relative rounded-md transition-colors ';
                if (shot?.isHit) {
                  cellClassName +=
                    'border border-[rgba(255,80,80,0.4)] bg-[rgba(160,30,30,0.22)] cursor-default';
                } else if (alreadyShot) {
                  cellClassName +=
                    'border border-[rgba(70,100,120,0.4)] bg-[rgba(10,25,40,0.65)] cursor-default';
                } else if (canFire) {
                  cellClassName +=
                    'ui-grid-cell cursor-crosshair hover:!border-[rgba(88,236,255,0.84)] hover:!bg-[rgba(7,37,52,0.94)] hover:shadow-[0_0_12px_rgba(0,212,255,0.22)]';
                } else {
                  cellClassName += 'ui-grid-cell cursor-default';
                }

                return (
                  <button
                    key={key}
                    type='button'
                    onClick={canFire ? () => onFire(x, y) : undefined}
                    className={cellClassName}
                    style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                    title={`${toColumnLabel(x)}${y + 1}`}
                  />
                );
              }),
            )}
          </div>

          <div
            className='pointer-events-none absolute'
            style={{
              left: `${boardOffsetX}px`,
              top: `${boardOffsetY}px`,
              width: `${boardPixelWidth}px`,
              height: `${boardPixelHeight}px`,
            }}
          >
            {placedShipSprites.map((sprite) => (
              <div
                key={sprite.key}
                className='absolute rounded-md'
                style={sprite.baseStyle}
              >
                {sprite.spriteStyle ? (
                  <div className='h-full w-full' style={sprite.spriteStyle} />
                ) : (
                  <div className='flex h-full w-full items-center justify-center rounded-md bg-[rgba(34,211,238,0.7)] text-[10px] font-bold text-[#04131f]'>
                    {sprite.ship.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div
            className='pointer-events-none absolute'
            style={{
              left: `${boardOffsetX}px`,
              top: `${boardOffsetY}px`,
              width: `${boardPixelWidth}px`,
              height: `${boardPixelHeight}px`,
            }}
          >
            {shots.map((shot) => {
              const markerLeft = shot.x * (cellSize + cellGap);
              const markerTop = shot.y * (cellSize + cellGap);

              return (
                <div
                  key={cellKey(shot.x, shot.y)}
                  className='absolute flex items-center justify-center'
                  style={{
                    left: `${markerLeft}px`,
                    top: `${markerTop}px`,
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                  }}
                >
                  {shot.isHit ? (
                    <span
                      className='select-none'
                      style={{
                        fontSize: `${Math.max(
                          GAME_PLAY_BOARD_RENDER.hitMarkerMinFontSize,
                          cellSize * GAME_PLAY_BOARD_RENDER.hitMarkerFontRatio,
                        )}px`,
                        lineHeight: 1,
                      }}
                    >
                      {'\u{1F4A5}'}
                    </span>
                  ) : (
                    <span
                      className='rounded-full bg-(--miss-color) opacity-70'
                      style={{
                        width: `${Math.max(
                          GAME_PLAY_BOARD_RENDER.missMarkerMinSize,
                          Math.round(cellSize * GAME_PLAY_BOARD_RENDER.missMarkerRatio),
                        )}px`,
                        height: `${Math.max(
                          GAME_PLAY_BOARD_RENDER.missMarkerMinSize,
                          Math.round(cellSize * GAME_PLAY_BOARD_RENDER.missMarkerRatio),
                        )}px`,
                        display: 'block',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {!revealShips && (
            <div
              className='pointer-events-none absolute'
              style={{
                left: `${boardOffsetX}px`,
                top: `${boardOffsetY}px`,
                width: `${boardPixelWidth}px`,
                height: `${boardPixelHeight}px`,
              }}
            >
              {shots
                .filter((shot) => shot.isHit && occupiedMap.has(cellKey(shot.x, shot.y)))
                .map((shot) => {
                  const occupiedCell = occupiedMap.get(cellKey(shot.x, shot.y));
                  return occupiedCell ? { ...shot, occupiedCell } : null;
                })
                .filter((shot): shot is NonNullable<typeof shot> => shot !== null)
                .filter((_, index, allShots) => {
                  return (
                    index ===
                    allShots.findIndex(
                      (candidate) =>
                        candidate.x === allShots[index].x &&
                        candidate.y === allShots[index].y,
                    )
                  );
                })
                .map(() => null)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BattleBoardPanel({
  tone,
  title,
  headerAside,
  boardProps,
  overlay,
  rootClassName = '',
  panelClassName = '',
  mobileHeaderPosition = 'top',
  desktopHeaderAlign = 'left',
}: BattleBoardPanelProps) {
  const isDesktopRightAligned = desktopHeaderAlign === 'right';
  const header = (
    <div
      className={`flex items-center justify-between gap-2 ${
        isDesktopRightAligned ? 'md:justify-end' : ''
      }`.trim()}
    >
      <div
        className={`flex items-center gap-2 ${
          isDesktopRightAligned ? 'md:flex-row-reverse' : ''
        }`.trim()}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${getToneClasses(tone)}`} />
        <p className='ui-tactical-caption'>{title}</p>
      </div>
      {headerAside ?? null}
    </div>
  );

  return (
    <div className={`flex min-h-0 flex-col gap-2 ${rootClassName}`.trim()}>
      {mobileHeaderPosition === 'bottom' ? (
        <div className='hidden md:block'>{header}</div>
      ) : (
        header
      )}

      <div
        className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md ui-panel ui-panel-strong p-2 sm:p-3 ${panelClassName}`.trim()}
      >
        <BattleBoard {...boardProps} />
        {overlay ?? null}
      </div>

      {mobileHeaderPosition === 'bottom' ? (
        <div className='md:hidden'>{header}</div>
      ) : null}
    </div>
  );
}
