import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { images } from "@/assets";
import type { BoardConfig, PlacedShip, ShipDefinition } from "@/types/game";
import {
    buildOccupiedMap,
    cellKey,
    instanceKey,
    type OccupiedCell,
} from "@/utils/placementUtils";
import {
    extractShipSpriteSheetMeta,
    getShipSpriteStyle,
    toSpriteDirectionFromPlacement,
    type ShipSpriteSheetMeta,
    type ShipSpriteSize,
} from "@/utils/shipSpriteSheet";

export interface BoardCellContext {
    x: number;
    y: number;
    key: string;
    label: string;
    occupied?: OccupiedCell;
}

export interface BoardCellProps {
    className?: string;
    disabled?: boolean;
    overlay?: ReactNode;
}

interface BoardProps {
    boardConfig: BoardConfig;
    ships: ShipDefinition[];
    placements: PlacedShip[];
    onCellClick?: (x: number, y: number) => void;
    getCellProps?: (cell: BoardCellContext) => BoardCellProps;
    visibleShipKeys?: "all" | ReadonlySet<string>;
    highlightedShipKeys?: ReadonlySet<string>;
    containerClassName?: string;
}

function toShipSpriteSize(size: number): ShipSpriteSize | null {
    if (size >= 1 && size <= 5) return size as ShipSpriteSize;
    return null;
}

function toColumnLabel(index: number): string {
    let value = index;
    let label = "";

    do {
        label = String.fromCharCode(65 + (value % 26)) + label;
        value = Math.floor(value / 26) - 1;
    } while (value >= 0);

    return label;
}

export function Board({
    boardConfig,
    ships,
    placements,
    onCellClick,
    getCellProps,
    visibleShipKeys = "all",
    highlightedShipKeys,
    containerClassName = "min-h-0 overflow-hidden rounded-2xl border border-[#7dbde0]/60 bg-white/40 p-3",
}: BoardProps) {
    const boardViewportRef = useRef<HTMLDivElement | null>(null);
    const boardMeasureRef = useRef<HTMLDivElement | null>(null);
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
        const element = boardMeasureRef.current ?? boardViewportRef.current;
        if (!element) return;

        const updateCellSize = () => {
            const axisAllowance = 28;
            const nextCellSize = Math.floor(
                Math.min(
                    (element.clientWidth -
                        axisAllowance -
                        (boardConfig.cols - 1) * 4) /
                        boardConfig.cols,
                    (element.clientHeight -
                        axisAllowance -
                        (boardConfig.rows - 1) * 4) /
                        boardConfig.rows,
                ),
            );

            setCellSize(Math.max(8, nextCellSize));
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
            const key = instanceKey(
                placement.definitionId,
                placement.instanceIndex,
            );
            if (visibleShipKeys !== "all" && !visibleShipKeys.has(key)) {
                return null;
            }

            const ship = shipsById.get(placement.definitionId);
            if (!ship) return null;

            const spriteSize = toShipSpriteSize(ship.size);
            const renderWidth =
                placement.orientation === "horizontal"
                    ? ship.size * cellSize + (ship.size - 1) * cellGap
                    : cellSize;
            const renderHeight =
                placement.orientation === "vertical"
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
                key,
                ship,
                highlighted: highlightedShipKeys?.has(key) ?? false,
                baseStyle,
                spriteStyle,
            };
        })
        .filter(
            (sprite): sprite is NonNullable<typeof sprite> => sprite !== null,
        );

    return (
        <div ref={boardViewportRef} className={containerClassName}>
            <div
                ref={boardMeasureRef}
                className="flex h-full w-full items-center justify-center"
            >
                <div
                    className="relative"
                    style={{
                        width: `${fullPixelWidth}px`,
                        height: `${fullPixelHeight}px`,
                    }}
                >
                    <div
                        className="absolute left-0 top-0 grid text-center text-[10px] font-bold text-[#3d5472]"
                        style={{
                            ...axisColumnStyle,
                            left: `${boardOffsetX}px`,
                            height: `${axisSize}px`,
                            lineHeight: `${axisSize}px`,
                        }}
                    >
                        {Array.from({ length: boardConfig.cols }).map(
                            (_, x) => (
                                <div key={`col-${x}`}>{toColumnLabel(x)}</div>
                            ),
                        )}
                    </div>

                    <div
                        className="absolute left-0 top-0 grid text-center text-[10px] font-bold text-[#3d5472]"
                        style={{
                            ...axisRowStyle,
                            top: `${boardOffsetY}px`,
                            width: `${axisSize}px`,
                        }}
                    >
                        {Array.from({ length: boardConfig.rows }).map(
                            (_, y) => (
                                <div
                                    key={`row-${y}`}
                                    style={{
                                        height: `${cellSize}px`,
                                        lineHeight: `${cellSize}px`,
                                    }}
                                >
                                    {y + 1}
                                </div>
                            ),
                        )}
                    </div>

                    <div
                        className="absolute grid"
                        style={{
                            ...boardStyle,
                            left: `${boardOffsetX}px`,
                            top: `${boardOffsetY}px`,
                        }}
                    >
                        {Array.from({ length: boardConfig.rows }).map((_, y) =>
                            Array.from({ length: boardConfig.cols }).map(
                                (__, x) => {
                                    const key = cellKey(x, y);
                                    const occupied = occupiedMap.get(key);
                                    const label = `${toColumnLabel(x)}${y + 1}`;
                                    const cellProps = getCellProps?.({
                                        x,
                                        y,
                                        key,
                                        label,
                                        occupied,
                                    });
                                    const className = cellProps?.className
                                        ? `rounded-md border transition ${cellProps.className}`
                                        : "rounded-md border border-[#a7cbe7] bg-white/70 transition hover:bg-white";

                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            disabled={cellProps?.disabled}
                                            onClick={() => onCellClick?.(x, y)}
                                            className={className}
                                            style={{
                                                width: `${cellSize}px`,
                                                height: `${cellSize}px`,
                                            }}
                                            title={label}
                                        />
                                    );
                                },
                            ),
                        )}
                    </div>

                    <div
                        className="pointer-events-none absolute"
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
                                    sprite.highlighted
                                        ? "ring-2 ring-[#2e5f93] ring-offset-1 ring-offset-transparent"
                                        : ""
                                }`}
                                style={sprite.baseStyle}
                            >
                                {sprite.spriteStyle ? (
                                    <div
                                        className="h-full w-full"
                                        style={sprite.spriteStyle}
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center rounded-md bg-[#7dbde0]/80 text-[10px] font-bold text-[#123a60]">
                                        {sprite.ship.name
                                            .slice(0, 1)
                                            .toUpperCase()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div
                        className="pointer-events-none absolute grid"
                        style={{
                            ...boardStyle,
                            left: `${boardOffsetX}px`,
                            top: `${boardOffsetY}px`,
                        }}
                    >
                        {Array.from({ length: boardConfig.rows }).map((_, y) =>
                            Array.from({ length: boardConfig.cols }).map(
                                (__, x) => {
                                    const key = cellKey(x, y);
                                    const occupied = occupiedMap.get(key);
                                    const label = `${toColumnLabel(x)}${y + 1}`;
                                    const cellProps = getCellProps?.({
                                        x,
                                        y,
                                        key,
                                        label,
                                        occupied,
                                    });

                                    return (
                                        <div
                                            key={`overlay-${key}`}
                                            className="flex items-center justify-center"
                                            style={{
                                                width: `${cellSize}px`,
                                                height: `${cellSize}px`,
                                            }}
                                        >
                                            {cellProps?.overlay ?? null}
                                        </div>
                                    );
                                },
                            ),
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
