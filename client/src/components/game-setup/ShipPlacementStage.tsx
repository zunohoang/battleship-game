import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlacementBoard } from '@/components/game-setup/PlacementBoard';
import { PlacementSidebar } from '@/components/game-setup/PlacementSidebar';
import {
  buildOccupiedMap,
  buildRandomPlacements,
  buildShipInstances,
  canPlace,
  instanceKey,
} from '@/utils/placementUtils';
import type {
  AiDifficulty,
  BoardConfig,
  Orientation,
  PlacedShip,
  ShipDefinition,
} from '@/types/game';

interface ShipPlacementStageProps {
  boardConfig: BoardConfig;
  ships: ShipDefinition[];
  placements: PlacedShip[];
  orientation: Orientation;
  onOrientationChange: (next: Orientation) => void;
  onPlacementsChange: (placements: PlacedShip[]) => void;
  aiDifficulty?: AiDifficulty;
  onAiDifficultyChange?: (d: AiDifficulty) => void;
}

export function ShipPlacementStage({
  boardConfig,
  ships,
  placements,
  orientation,
  onOrientationChange,
  onPlacementsChange,
  aiDifficulty,
  onAiDifficultyChange,
}: ShipPlacementStageProps) {
  const { t } = useTranslation();
  const [selectedInstanceKey, setSelectedInstanceKey] = useState<string | null>(null);
  const [errorText, setErrorText] = useState('');

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

  const effectiveSelectedInstanceKey = useMemo(() => {
    if (shipInstances.length === 0) {
      return null;
    }

    const selectedIsValid =
      selectedInstanceKey !== null &&
      shipInstances.some(
        (instance) =>
          instanceKey(
            instance.definitionId,
            instance.instanceIndex,
          ) === selectedInstanceKey,
      );

    if (selectedIsValid) {
      return selectedInstanceKey;
    }

    const firstUnplaced = shipInstances.find(
      (instance) =>
        !placementsByInstanceKey.has(
          instanceKey(instance.definitionId, instance.instanceIndex),
        ),
    );

    const fallback = firstUnplaced ?? shipInstances[0];
    return instanceKey(fallback.definitionId, fallback.instanceIndex);
  }, [placementsByInstanceKey, selectedInstanceKey, shipInstances]);

  const selectedInstance = useMemo(() => {
    if (!effectiveSelectedInstanceKey) return null;
    return (
      shipInstances.find(
        (instance) =>
          instanceKey(
            instance.definitionId,
            instance.instanceIndex,
          ) === effectiveSelectedInstanceKey,
      ) ?? null
    );
  }, [effectiveSelectedInstanceKey, shipInstances]);

  const totalRequiredShips = shipInstances.length;
  const placedShipsCount = placements.length;
  const allShipsPlaced =
        totalRequiredShips > 0 && placedShipsCount === totalRequiredShips;

  const handlePlaceAt = (x: number, y: number) => {
    if (!selectedInstance) {
      setErrorText(t('gameSetup.placement.selectShipFirst'));
      return;
    }

    setErrorText('');

    const currentKey = instanceKey(
      selectedInstance.definitionId,
      selectedInstance.instanceIndex,
    );
    const placementsWithoutCurrent = placements.filter(
      (placement) =>
        instanceKey(placement.definitionId, placement.instanceIndex) !== currentKey,
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
        t('gameSetup.placement.cannotPlaceHere'),
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
    setErrorText('');
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
    setErrorText('');
    onPlacementsChange([]);
  };

  const handleRandomPlace = () => {
    setErrorText('');
    const nextPlacements = buildRandomPlacements(
      shipInstances,
      boardConfig,
      shipsById,
    );

    if (!nextPlacements) {
      setErrorText(
        t('gameSetup.placement.randomPlacementFailed'),
      );
      return;
    }

    onPlacementsChange(nextPlacements);
  };

  const handleRotate = () => {
    onOrientationChange(
      orientation === 'horizontal' ? 'vertical' : 'horizontal',
    );
  };

  const statusText = errorText ||
    (allShipsPlaced
      ? t('gameSetup.placement.allShipsPlaced')
      : t('gameSetup.placement.placementInstructions'));

  return (
    <div className='flex flex-col gap-3 sm:h-full sm:min-h-0'>
      <div className='grid gap-3 sm:min-h-0 sm:flex-1 lg:grid-cols-[minmax(0,1fr)_32rem]'>
        <PlacementBoard
          boardConfig={boardConfig}
          ships={ships}
          placements={placements}
          selectedInstanceKey={effectiveSelectedInstanceKey}
          onPlaceAt={handlePlaceAt}
        />
        <PlacementSidebar
          shipInstances={shipInstances}
          placementsByInstanceKey={placementsByInstanceKey}
          selectedInstanceKey={effectiveSelectedInstanceKey}
          onSelectInstance={setSelectedInstanceKey}
          onRemovePlaced={handleRemovePlaced}
          onRandomPlace={handleRandomPlace}
          onRotate={handleRotate}
          onClearBoard={handleClearBoard}
          boardConfig={boardConfig}
          orientation={orientation}
          placedShipsCount={placedShipsCount}
          totalRequiredShips={totalRequiredShips}
          statusText={statusText}
          hasError={Boolean(errorText)}
          aiDifficulty={aiDifficulty}
          onAiDifficultyChange={onAiDifficultyChange}
        />
      </div>
    </div>
  );
}
