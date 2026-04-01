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
} from '@/services/bots/core/shared/placementUtils';
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
  onPlacementsChange: (placements: PlacedShip[]) => void;
  isOpponentReady: boolean;
  primaryActionDisabled: boolean;
  onPrimaryAction?: () => void;
  aiDifficulty?: AiDifficulty;
  onAiDifficultyChange?: (d: AiDifficulty) => void;
}

export function ShipPlacementStage({
  boardConfig,
  ships,
  placements,
  onPlacementsChange,
  isOpponentReady,
  primaryActionDisabled,
  onPrimaryAction,
  aiDifficulty,
  onAiDifficultyChange,
}: ShipPlacementStageProps) {
  const { t } = useTranslation();
  const [selectedInstanceKey, setSelectedInstanceKey] = useState<string | null>(
    null,
  );
  const [instanceOrientations, setInstanceOrientations] = useState<Map<string, Orientation>>(
    new Map(),
  );
  const [errorText, setErrorText] = useState('');

  const getInstanceOrientation = (key: string): Orientation =>
    instanceOrientations.get(key) ?? 'horizontal';

  const shipsById = useMemo(
    () => new Map(ships.map((ship) => [ship.id, ship])),
    [ships],
  );
  const shipInstances = useMemo(() => buildShipInstances(ships), [ships]);
  const placementsByInstanceKey = useMemo(
    () =>
      new Map(
        placements.map((placement) => [
          instanceKey(placement.definitionId, placement.instanceIndex),
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
          instanceKey(instance.definitionId, instance.instanceIndex) ===
          selectedInstanceKey,
      );

    if (selectedIsValid) {
      return selectedInstanceKey;
    }

    return instanceKey(
      shipInstances[0].definitionId,
      shipInstances[0].instanceIndex,
    );
  }, [selectedInstanceKey, shipInstances]);

  const selectedInstance = useMemo(() => {
    if (!effectiveSelectedInstanceKey) return null;
    return (
      shipInstances.find(
        (instance) =>
          instanceKey(instance.definitionId, instance.instanceIndex) ===
          effectiveSelectedInstanceKey,
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
        instanceKey(placement.definitionId, placement.instanceIndex) !==
        currentKey,
    );
    const occupiedWithoutCurrent = buildOccupiedMap(
      placementsWithoutCurrent,
      shipsById,
    );

    const existingPlacement = placementsByInstanceKey.get(currentKey);
    const effectiveOrientation = existingPlacement
      ? existingPlacement.orientation
      : getInstanceOrientation(currentKey);

    const candidate: PlacedShip = {
      definitionId: selectedInstance.definitionId,
      instanceIndex: selectedInstance.instanceIndex,
      x,
      y,
      orientation: effectiveOrientation,
    };

    if (
      !canPlace(
        candidate,
        selectedInstance.size,
        boardConfig,
        occupiedWithoutCurrent,
      )
    ) {
      setErrorText(t('gameSetup.placement.cannotPlaceHere'));
      return;
    }

    const nextPlacements = [...placementsWithoutCurrent, candidate];
    onPlacementsChange(nextPlacements);
  };

  const handleRemovePlaced = (definitionId: string, instanceIndex: number) => {
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
      setErrorText(t('gameSetup.placement.randomPlacementFailed'));
      return;
    }

    onPlacementsChange(nextPlacements);
  };

  const handleRotate = () => {
    if (!effectiveSelectedInstanceKey) return;

    const placement = placementsByInstanceKey.get(effectiveSelectedInstanceKey);

    if (placement) {
      // Ship is already placed — rotate it in-place
      const newOrientation: Orientation =
        placement.orientation === 'horizontal' ? 'vertical' : 'horizontal';
      const placementsWithoutCurrent = placements.filter(
        (p) => instanceKey(p.definitionId, p.instanceIndex) !== effectiveSelectedInstanceKey,
      );
      const occupiedWithoutCurrent = buildOccupiedMap(placementsWithoutCurrent, shipsById);
      const candidate: PlacedShip = { ...placement, orientation: newOrientation };

      if (canPlace(candidate, selectedInstance!.size, boardConfig, occupiedWithoutCurrent)) {
        setErrorText('');
        onPlacementsChange([...placementsWithoutCurrent, candidate]);
      } else {
        setErrorText(t('gameSetup.placement.cannotPlaceHere'));
      }
    } else {
      // Ship not yet placed — toggle its own pending orientation
      const current = getInstanceOrientation(effectiveSelectedInstanceKey);
      setInstanceOrientations((prev) => {
        const next = new Map(prev);
        next.set(effectiveSelectedInstanceKey, current === 'horizontal' ? 'vertical' : 'horizontal');
        return next;
      });
    }
  };

  const statusText =
    errorText ||
    (allShipsPlaced
      ? t('gameSetup.placement.allShipsPlaced')
      : t('gameSetup.placement.placementInstructions'));

  return (
    <div className='flex flex-col gap-3 sm:h-full sm:min-h-0'>
      <div className='grid gap-3 sm:min-h-0 sm:flex-1 lg:grid-cols-[minmax(0,1.12fr)_28rem]'>
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
          orientation={
            effectiveSelectedInstanceKey
              ? (placementsByInstanceKey.get(effectiveSelectedInstanceKey)?.orientation
                ?? getInstanceOrientation(effectiveSelectedInstanceKey))
              : 'horizontal'
          }
          onRotate={handleRotate}
          onClearBoard={handleClearBoard}
          primaryActionDisabled={primaryActionDisabled}
          onPrimaryAction={onPrimaryAction}
          placedShipsCount={placedShipsCount}
          totalRequiredShips={totalRequiredShips}
          isOpponentReady={isOpponentReady}
          statusText={statusText}
          hasError={Boolean(errorText)}
          aiDifficulty={aiDifficulty}
          onAiDifficultyChange={onAiDifficultyChange}
        />
      </div>
    </div>
  );
}
