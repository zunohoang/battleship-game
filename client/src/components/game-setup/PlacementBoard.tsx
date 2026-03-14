import { useMemo } from "react";
import { Board, type BoardCellContext } from "@/components/board/Board";
import type { BoardConfig, PlacedShip, ShipDefinition } from "@/types/game";
import { instanceKey } from "@/utils/placementUtils";

interface PlacementBoardProps {
    boardConfig: BoardConfig;
    ships: ShipDefinition[];
    placements: PlacedShip[];
    selectedInstanceKey: string | null;
    onPlaceAt: (x: number, y: number) => void;
}

export function PlacementBoard({
    boardConfig,
    ships,
    placements,
    selectedInstanceKey,
    onPlaceAt,
}: PlacementBoardProps) {
    const highlightedShipKeys = useMemo(() => {
        if (!selectedInstanceKey) return new Set<string>();
        return new Set([selectedInstanceKey]);
    }, [selectedInstanceKey]);

    const getCellProps = ({ occupied }: BoardCellContext) => {
        const isSelectedPlaced =
            occupied &&
            selectedInstanceKey ===
                instanceKey(occupied.definitionId, occupied.instanceIndex);

        return {
            className: occupied
                ? isSelectedPlaced
                    ? "border-[#2e5f93] bg-[#d6ebfb]"
                    : "border-[#8fbcdf] bg-[#eef7ff]"
                : "border-[#a7cbe7] bg-white/70 hover:bg-white",
        };
    };

    return (
        <Board
            boardConfig={boardConfig}
            ships={ships}
            placements={placements}
            onCellClick={onPlaceAt}
            getCellProps={getCellProps}
            visibleShipKeys="all"
            highlightedShipKeys={highlightedShipKeys}
        />
    );
}
