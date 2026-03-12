import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PlacementBoard } from "@/components/game-setup/PlacementBoard";
import { PlacementSidebar } from "@/components/game-setup/PlacementSidebar";
import {
    buildOccupiedMap,
    buildRandomPlacements,
    buildShipInstances,
    canPlace,
    instanceKey,
} from "@/utils/placementUtils";
import type {
    BoardConfig,
    Orientation,
    PlacedShip,
    ShipDefinition,
} from "@/types/game";

interface ShipPlacementStageProps {
    boardConfig: BoardConfig;
    ships: ShipDefinition[];
    placements: PlacedShip[];
    onPlacementsChange: (placements: PlacedShip[]) => void;
}

export function ShipPlacementStage({
    boardConfig,
    ships,
    placements,
    onPlacementsChange,
}: ShipPlacementStageProps) {
    const { t } = useTranslation();
    const [orientation, setOrientation] = useState<Orientation>("horizontal");
    const [selectedInstanceKey, setSelectedInstanceKey] = useState<
        string | null
    >(null);
    const [errorText, setErrorText] = useState("");

    const shipsById = useMemo(
        () => new Map(ships.map((ship) => [ship.id, ship])),
        [ships],
    );
    const shipInstances = useMemo(() => buildShipInstances(ships), [ships]);
    const placementsByInstanceKey = useMemo(
        () =>
            new Map(
                placements.map((placement) => [
                    instanceKey(
                        placement.definitionId,
                        placement.instanceIndex,
                    ),
                    placement,
                ]),
            ),
        [placements],
    );

    useEffect(() => {
        if (shipInstances.length === 0) {
            setSelectedInstanceKey(null);
            return;
        }

        const selectedIsValid =
            selectedInstanceKey &&
            shipInstances.some(
                (instance) =>
                    instanceKey(
                        instance.definitionId,
                        instance.instanceIndex,
                    ) === selectedInstanceKey,
            );

        if (selectedIsValid) return;

        const firstUnplaced = shipInstances.find(
            (instance) =>
                !placementsByInstanceKey.has(
                    instanceKey(instance.definitionId, instance.instanceIndex),
                ),
        );

        const fallback = firstUnplaced ?? shipInstances[0];
        setSelectedInstanceKey(
            instanceKey(fallback.definitionId, fallback.instanceIndex),
        );
    }, [placementsByInstanceKey, selectedInstanceKey, shipInstances]);

    const selectedInstance = useMemo(() => {
        if (!selectedInstanceKey) return null;
        return (
            shipInstances.find(
                (instance) =>
                    instanceKey(
                        instance.definitionId,
                        instance.instanceIndex,
                    ) === selectedInstanceKey,
            ) ?? null
        );
    }, [selectedInstanceKey, shipInstances]);

    const totalRequiredShips = shipInstances.length;
    const placedShipsCount = placements.length;
    const allShipsPlaced =
        totalRequiredShips > 0 && placedShipsCount === totalRequiredShips;

    const handlePlaceAt = (x: number, y: number) => {
        if (!selectedInstance) {
            setErrorText(t("gameSetup.placement.selectShipFirst"));
            return;
        }

        setErrorText("");

        const currentKey = instanceKey(
            selectedInstance.definitionId,
            selectedInstance.instanceIndex,
        );
        const placementsWithoutCurrent = placements.filter(
            (placement) =>
                instanceKey(placement.definitionId, placement.instanceIndex) !==
                currentKey,
        );
        const occupiedWithoutCurrent = buildOccupiedMap(
            placementsWithoutCurrent,
            shipsById,
        );

        const candidate: PlacedShip = {
            definitionId: selectedInstance.definitionId,
            instanceIndex: selectedInstance.instanceIndex,
            x,
            y,
            orientation,
        };

        if (
            !canPlace(
                candidate,
                selectedInstance.size,
                boardConfig,
                occupiedWithoutCurrent,
            )
        ) {
            setErrorText(
                t("gameSetup.placement.cannotPlaceHere"),
            );
            return;
        }

        const nextPlacements = [...placementsWithoutCurrent, candidate];
        onPlacementsChange(nextPlacements);

        const nextUnplaced = shipInstances.find(
            (instance) =>
                !nextPlacements.some(
                    (placement) =>
                        placement.definitionId === instance.definitionId &&
                        placement.instanceIndex === instance.instanceIndex,
                ),
        );

        if (nextUnplaced) {
            setSelectedInstanceKey(
                instanceKey(
                    nextUnplaced.definitionId,
                    nextUnplaced.instanceIndex,
                ),
            );
        }
    };

    const handleRemovePlaced = (
        definitionId: string,
        instanceIndex: number,
    ) => {
        setErrorText("");
        onPlacementsChange(
            placements.filter(
                (placement) =>
                    !(
                        placement.definitionId === definitionId &&
                        placement.instanceIndex === instanceIndex
                    ),
            ),
        );
        setSelectedInstanceKey(instanceKey(definitionId, instanceIndex));
    };

    const handleClearBoard = () => {
        setErrorText("");
        onPlacementsChange([]);
    };

    const handleRandomPlace = () => {
        setErrorText("");
        const nextPlacements = buildRandomPlacements(
            shipInstances,
            boardConfig,
            shipsById,
        );

        if (!nextPlacements) {
            setErrorText(
                t("gameSetup.placement.randomPlacementFailed"),
            );
            return;
        }

        onPlacementsChange(nextPlacements);
    };

    return (
        <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#708aac]">
                    {t("gameSetup.placement.placedCount", { count: placedShipsCount, total: totalRequiredShips })}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setOrientation("horizontal")}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                            orientation === "horizontal"
                                ? "border-[#3f77b2] bg-[#3f77b2]/85 text-white"
                                : "border-[#7dbde0] bg-white/70 text-[#3d5472]"
                        }`}
                    >
                        {t("gameSetup.placement.horizontal")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setOrientation("vertical")}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                            orientation === "vertical"
                                ? "border-[#3f77b2] bg-[#3f77b2]/85 text-white"
                                : "border-[#7dbde0] bg-white/70 text-[#3d5472]"
                        }`}
                    >
                        {t("gameSetup.placement.vertical")}
                    </button>
                </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <PlacementBoard
                    boardConfig={boardConfig}
                    ships={ships}
                    placements={placements}
                    selectedInstanceKey={selectedInstanceKey}
                    onPlaceAt={handlePlaceAt}
                />
                <PlacementSidebar
                    shipInstances={shipInstances}
                    placementsByInstanceKey={placementsByInstanceKey}
                    selectedInstanceKey={selectedInstanceKey}
                    onSelectInstance={setSelectedInstanceKey}
                    onRemovePlaced={handleRemovePlaced}
                    onRandomPlace={handleRandomPlace}
                    onClearBoard={handleClearBoard}
                />
            </div>

            <div className="flex items-center justify-between gap-3">
                <p
                    className={`text-xs ${errorText ? "text-[#8f2f2f]" : "text-[#5f7f9f]"}`}
                >
                    {errorText ||
                        (allShipsPlaced
                            ? t("gameSetup.placement.allShipsPlaced")
                            : t("gameSetup.placement.placementInstructions"))}
                </p>
            </div>
        </div>
    );
}
