import { useEffect, useMemo, useRef, useState } from 'react';
import { images } from '@/assets';
import {
  extractShipSpriteSheetMeta,
  getShipSpriteStyle,
  toSpriteDirectionFromPlacement,
  type ShipSpriteSheetMeta,
  type ShipSpriteSize,
} from '@/utils/shipSpriteSheet';
import type { BoardConfig, PlacedShip, ShipDefinition, Shot } from '@/types/game';
import { buildOccupiedMap, cellKey, instanceKey } from '@/utils/placementUtils';

interface BattleBoardProps {
  boardConfig: BoardConfig;
  ships: ShipDefinition[];
  placements: PlacedShip[];
  shots: Shot[];
  onFire?: (x: number, y: number) => void;
  isActive?: boolean;
  revealShips?: boolean;
}

function toShipSpriteSize(size: number): ShipSpriteSize | null {
  if (size >= 1 && size <= 5) return size as ShipSpriteSize;
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

export function BattleBoard({
  boardConfig,
  ships,
  placements,
  shots,
  onFire,
  isActive = false,
  revealShips = false,
}: BattleBoardProps) {
  const boardViewportRef = useRef<HTMLDivElement | null>(null);
  const [cellSize, setCellSize] = useState(28);
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
    () => new Map(shots.map((s) => [cellKey(s.x, s.y), s])),
    [shots],
  );

  useEffect(() => {
    let cancelled = false;
    extractShipSpriteSheetMeta(images.battleShipSheet)
      .then((meta) => { if (!cancelled) setSpriteMeta(meta); })
      .catch(() => { if (!cancelled) setSpriteMeta(null); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const element = boardViewportRef.current;
    if (!element) return;

    const updateCellSize = () => {
      const axisAllowance = 28;
      const nextCellSize = Math.floor(
        Math.min(
          (element.clientWidth - axisAllowance - (boardConfig.cols - 1) * 4) / boardConfig.cols,
          (element.clientHeight - axisAllowance - (boardConfig.rows - 1) * 4) / boardConfig.rows,
        ),
      );
      setCellSize(Math.max(8, nextCellSize));
    };

    updateCellSize();
    const observer = new ResizeObserver(updateCellSize);
    observer.observe(element);
    return () => { observer.disconnect(); };
  }, [boardConfig.cols, boardConfig.rows]);

  const cellGap = cellSize <= 18 ? 2 : 4;
  const axisSize = cellSize <= 18 ? 14 : 20;
  const boardOffsetX = axisSize + cellGap;
  const boardOffsetY = axisSize + cellGap;
  const boardPixelWidth = boardConfig.cols * cellSize + (boardConfig.cols - 1) * cellGap;
  const boardPixelHeight = boardConfig.rows * cellSize + (boardConfig.rows - 1) * cellGap;
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

  // Ship sprites (only rendered when revealShips=true)
  const placedShipSprites = revealShips
    ? placements
      .map((placement) => {
        const ship = shipsById.get(placement.definitionId);
        if (!ship) return null;

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
      .filter((s): s is NonNullable<typeof s> => s !== null)
    : [];

  return (
    <div
      ref={boardViewportRef}
      className='h-full w-full overflow-hidden'
    >
      <div className='flex h-full w-full items-center justify-center'>
        <div
          className='relative'
          style={{ width: `${fullPixelWidth}px`, height: `${fullPixelHeight}px` }}
        >
          {/* Column labels */}
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

          {/* Row labels */}
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

          {/* Grid cells */}
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

                let cellCls = 'relative rounded-md transition-colors ';
                if (shot?.isHit) {
                  cellCls += 'border border-[rgba(255,80,80,0.4)] bg-[rgba(160,30,30,0.22)] cursor-default';
                } else if (alreadyShot) {
                  cellCls += 'border border-[rgba(70,100,120,0.4)] bg-[rgba(10,25,40,0.65)] cursor-default';
                } else if (canFire) {
                  cellCls +=
                    'ui-grid-cell cursor-crosshair hover:!border-[rgba(88,236,255,0.84)] hover:!bg-[rgba(7,37,52,0.94)] hover:shadow-[0_0_12px_rgba(0,212,255,0.22)]';
                } else {
                  cellCls += 'ui-grid-cell cursor-default';
                }

                return (
                  <button
                    key={key}
                    type='button'
                    onClick={canFire ? () => onFire(x, y) : undefined}
                    className={cellCls}
                    style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                    title={`${toColumnLabel(x)}${y + 1}`}
                  />
                );
              }),
            )}
          </div>

          {/* Ship sprites layer (pointer-events-none) */}
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

          {/* Shot markers layer — always on top */}
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
                      style={{ fontSize: `${Math.max(10, cellSize * 0.65)}px`, lineHeight: 1 }}
                    >
                      💥
                    </span>
                  ) : (
                    <span
                      className='rounded-full bg-(--miss-color) opacity-70'
                      style={{
                        width: `${Math.max(4, Math.round(cellSize * 0.3))}px`,
                        height: `${Math.max(4, Math.round(cellSize * 0.3))}px`,
                        display: 'block',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Occupied map layer for revealed enemy ships (under shots) */}
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
                .filter((s) => s.isHit && occupiedMap.has(cellKey(s.x, s.y)))
                .map((s) => {
                  const occ = occupiedMap.get(cellKey(s.x, s.y))!;
                  return { ...s, occ };
                })
                .filter((_, i, arr) => {
                  // deduplicate (just render the hit markers, already handled above)
                  return i === arr.findIndex((a) => a.x === arr[i].x && a.y === arr[i].y);
                })
                .map(() => null)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
