import { useEffect, useMemo, useRef, useState } from "react";
import { images } from "@/assets";
import {
    extractShipSpriteSheetMeta,
    getShipSpriteStyle,
    toSpriteDirectionFromPlacement,
    type ShipSpriteSheetMeta,
    type ShipSpriteSize,
} from "@/utils/shipSpriteSheet";
import type { BoardConfig, PlacedShip, ShipDefinition } from "@/types/game";
import { buildOccupiedMap, cellKey, instanceKey } from "@/utils/placementUtils";

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
            const nextCellSize = Math.floor(
                Math.min(
                    (element.clientWidth - (boardConfig.cols - 1) * 4) /
                        boardConfig.cols,
                    (element.clientHeight - (boardConfig.rows - 1) * 4) /
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
    const boardPixelWidth =
        boardConfig.cols * cellSize + (boardConfig.cols - 1) * cellGap;
    const boardPixelHeight =
        boardConfig.rows * cellSize + (boardConfig.rows - 1) * cellGap;
    const boardStyle = {
        gridTemplateColumns: `repeat(${boardConfig.cols}, ${cellSize}px)`,
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
            className="min-h-0 overflow-hidden rounded-2xl border border-[#7dbde0]/60 bg-white/40 p-3"
        >
            <div className="flex h-full w-full items-center justify-center">
                <div
                    className="relative"
                    style={{
                        width: `${boardPixelWidth}px`,
                        height: `${boardPixelHeight}px`,
                    }}
                >
                    <div className="grid" style={boardStyle}>
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
                                            type="button"
                                            onClick={() => onPlaceAt(x, y)}
                                            className={`rounded-md border transition ${
                                                occupied
                                                    ? isSelectedPlaced
                                                        ? "border-[#2e5f93] bg-[#d6ebfb]"
                                                        : "border-[#8fbcdf] bg-[#eef7ff]"
                                                    : "border-[#a7cbe7] bg-white/70 hover:bg-white"
                                            }`}
                                            style={{
                                                width: `${cellSize}px`,
                                                height: `${cellSize}px`,
                                            }}
                                            title={`(${x + 1}, ${y + 1})`}
                                        />
                                    );
                                },
                            ),
                        )}
                    </div>

                    <div className="pointer-events-none absolute inset-0">
                        {placedShipSprites.map((sprite) => (
                            <div
                                key={sprite.key}
                                className={`absolute rounded-md ${
                                    sprite.selected
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
                </div>
            </div>
        </div>
    );
}
