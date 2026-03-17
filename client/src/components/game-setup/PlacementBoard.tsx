import { useEffect, useMemo, useRef, useState } from 'react';
import { images } from '@/assets';
import {
  extractShipSpriteSheetMeta,
  getShipSpriteStyle,
  toSpriteDirectionFromPlacement,
  type ShipSpriteSheetMeta,
  type ShipSpriteSize,
} from '@/utils/shipSpriteSheet';
import type { BoardConfig, PlacedShip, ShipDefinition } from '@/types/game';
import { buildOccupiedMap, cellKey, instanceKey } from '@/utils/placementUtils';

interface PlacementBoardProps {
  boardConfig: BoardConfig;
  ships: ShipDefinition[];
  placements: PlacedShip[];
  selectedInstanceKey: string | null;
  onPlaceAt: (x: number, y: number) => void;
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

export function PlacementBoard({
  boardConfig,
  ships,
  placements,
  selectedInstanceKey,
  onPlaceAt,
}: PlacementBoardProps) {
  const boardViewportRef = useRef<HTMLDivElement | null>(null);
  const [cellSize, setCellSize] = useState(28);
  const [spriteMeta, setSpriteMeta] = useState<ShipSpriteSheetMeta | null>(
    null,
  );

  const shipsById = useMemo(
    () => new Map(ships.map((ship) => [ship.id, ship])),
    [ships],
  );
  const occupiedMap = useMemo(
    () => buildOccupiedMap(placements, shipsById),
    [placements, shipsById],
  );

  useEffect(() => {
    let cancelled = false;

    extractShipSpriteSheetMeta(images.battleShipSheet)
      .then((meta) => {
        if (!cancelled) setSpriteMeta(meta);
      })
      .catch(() => {
        if (!cancelled) setSpriteMeta(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const element = boardViewportRef.current;
    if (!element) return;

    const updateCellSize = () => {
      const axisAllowance = 28;
      const nextCellSize = Math.floor(
        Math.min(
          (element.clientWidth - axisAllowance -
            (boardConfig.cols - 1) * 4) /
            boardConfig.cols,
          (element.clientHeight - axisAllowance -
            (boardConfig.rows - 1) * 4) /
            boardConfig.rows,
        ),
      );

      setCellSize(Math.max(12, nextCellSize));
    };

    updateCellSize();

    const observer = new ResizeObserver(updateCellSize);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [boardConfig.cols, boardConfig.rows]);

  const cellGap = cellSize <= 18 ? 2 : 4;
  const axisSize = cellSize <= 18 ? 14 : 20;
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

  const placedShipSprites = placements
    .map((placement) => {
      const ship = shipsById.get(placement.definitionId);
      if (!ship) return null;

      const selected =
        selectedInstanceKey ===
        instanceKey(placement.definitionId, placement.instanceIndex);
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
        key: instanceKey(
          placement.definitionId,
          placement.instanceIndex,
        ),
        selected,
        ship,
        baseStyle,
        spriteStyle,
      };
    })
    .filter(
      (sprite): sprite is NonNullable<typeof sprite> => sprite !== null,
    );

  return (
    <div
      ref={boardViewportRef}
      className='ui-panel ui-panel-strong min-h-80 overflow-auto rounded-md p-3 sm:min-h-0 sm:overflow-hidden sm:p-4'
    >
      <div className='flex h-full w-full items-center justify-center'>
        <div
          className='relative'
          style={{
            width: `${fullPixelWidth}px`,
            height: `${fullPixelHeight}px`,
          }}
        >
          <div
            className='absolute left-0 top-0 grid text-center font-mono text-[10px] font-bold text-(--text-subtle)'
            style={{
              ...axisColumnStyle,
              left: `${boardOffsetX}px`,
              height: `${axisSize}px`,
              lineHeight: `${axisSize}px`,
            }}
          >
            {Array.from({ length: boardConfig.cols }).map((_, x) => (
              <div key={`col-${x}`}>{toColumnLabel(x)}</div>
            ))}
          </div>

          <div
            className='absolute left-0 top-0 grid text-center font-mono text-[10px] font-bold text-(--text-subtle)'
            style={{
              ...axisRowStyle,
              top: `${boardOffsetY}px`,
              width: `${axisSize}px`,
            }}
          >
            {Array.from({ length: boardConfig.rows }).map((_, y) => (
              <div
                key={`row-${y}`}
                style={{
                  height: `${cellSize}px`,
                  lineHeight: `${cellSize}px`,
                }}
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
              Array.from({ length: boardConfig.cols }).map(
                (__, x) => {
                  const occupied = occupiedMap.get(
                    cellKey(x, y),
                  );
                  const isSelectedPlaced =
                    occupied &&
                    selectedInstanceKey ===
                      instanceKey(
                        occupied.definitionId,
                        occupied.instanceIndex,
                      );

                  return (
                    <button
                      key={cellKey(x, y)}
                      type='button'
                      onClick={() => onPlaceAt(x, y)}
                      className='ui-grid-cell rounded-md'
                      data-occupied={occupied ? 'true' : 'false'}
                      data-selected={isSelectedPlaced ? 'true' : 'false'}
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                      }}
                      title={`${toColumnLabel(x)}${y + 1}`}
                    />
                  );
                },
              ),
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
                className={`absolute rounded-md ${
                  sprite.selected
                    ? 'ring-2 ring-[rgba(106,234,255,0.92)] ring-offset-1 ring-offset-transparent'
                    : ''
                }`}
                style={sprite.baseStyle}
              >
                {sprite.spriteStyle ? (
                  <div
                    className='h-full w-full'
                    style={sprite.spriteStyle}
                  />
                ) : (
                  <div className='flex h-full w-full items-center justify-center rounded-md bg-[rgba(34,211,238,0.7)] text-[10px] font-bold text-[#04131f]'>
                    {sprite.ship.name
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
