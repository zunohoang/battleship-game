import { useCallback, useEffect, useMemo, useState } from "react";
import { CONFIG_LIMITS } from "@/constants/gameDefaults";
import { useGameSetup } from "@/store/gameSetupContext";
import type { ShipDefinition } from "@/types/game";

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function generateId() {
    return Math.random().toString(36).slice(2, 8);
}

export function useGameSetupEngine() {
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
    const [newShipName, setNewShipName] = useState("");
    const [newShipSize, setNewShipSize] = useState(3);
    const [newShipCount, setNewShipCount] = useState(1);

    const { boardConfig, ships } = state.config;

    const handleBoardPreset = (rows: number, cols: number) => {
        setBoardConfig({ rows, cols });
    };

    const handleBoardInput = (field: "rows" | "cols", raw: string) => {
        const val = parseInt(raw, 10);
        if (Number.isNaN(val)) return;
        setBoardConfig({
            ...boardConfig,
            [field]: clamp(
                val,
                field === "rows"
                    ? CONFIG_LIMITS.board.minRows
                    : CONFIG_LIMITS.board.minCols,
                field === "rows"
                    ? CONFIG_LIMITS.board.maxRows
                    : CONFIG_LIMITS.board.maxCols,
            ),
        });
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

        setNewShipName("");
        setNewShipSize(3);
        setNewShipCount(1);
    }, [addShipDefinition, newShipName, newShipSize, newShipCount]);

    const handleShipField = (
        id: string,
        field: keyof Omit<ShipDefinition, "id">,
        raw: string,
    ) => {
        if (field === "name") {
            updateShipDefinition(id, { name: raw });
            return;
        }

        const val = parseInt(raw, 10);
        if (Number.isNaN(val)) return;

        if (field === "size") {
            updateShipDefinition(id, {
                size: clamp(
                    val,
                    CONFIG_LIMITS.ship.minSize,
                    CONFIG_LIMITS.ship.maxSize,
                ),
            });
        }

        if (field === "count") {
            updateShipDefinition(id, {
                count: clamp(
                    val,
                    CONFIG_LIMITS.ship.minCount,
                    CONFIG_LIMITS.ship.maxCount,
                ),
            });
        }
    };

    const handleNewShipSizeInput = (raw: string) => {
        const val = parseInt(raw, 10);
        if (Number.isNaN(val)) return;

        setNewShipSize(
            clamp(val, CONFIG_LIMITS.ship.minSize, CONFIG_LIMITS.ship.maxSize),
        );
    };

    const handleNewShipCountInput = (raw: string) => {
        const val = parseInt(raw, 10);
        if (Number.isNaN(val)) return;

        setNewShipCount(clamp(val, 1, CONFIG_LIMITS.ship.maxCount));
    };

    const handleNext = () => {
        clearPlacements();
        setStep(2);
    };

    const handleBackToConfig = () => {
        clearPlacements();
        setStep(1);
    };

    const totalCells = ships.reduce((n, s) => n + s.size * s.count, 0);
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

    return {
        step,
        newShipName,
        newShipSize,
        newShipCount,
        state,
        boardConfig,
        ships,
        totalCells,
        boardCells,
        isConfigValid,
        allShipsPlaced,
        setNewShipName,
        setPlacements,
        removeShipDefinition,
        resetConfig,
        handleBoardPreset,
        handleBoardInput,
        handleAddShip,
        handleShipField,
        handleNewShipSizeInput,
        handleNewShipCountInput,
        handleNext,
        handleBackToConfig,
    };
}