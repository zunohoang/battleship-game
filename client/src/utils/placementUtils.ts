import type {
  BoardConfig,
  Orientation,
  PlacedShip,
  ShipDefinition,
} from '@/types/game';

export type ShipInstance = {
    definitionId: string;
    instanceIndex: number;
    name: string;
    size: number;
};

export type OccupiedCell = {
    definitionId: string;
    instanceIndex: number;
};

export function instanceKey(definitionId: string, instanceIndex: number) {
  return `${definitionId}:${instanceIndex}`;
}

export function cellKey(x: number, y: number) {
  return `${x},${y}`;
}

export function buildShipInstances(ships: ShipDefinition[]): ShipInstance[] {
  return ships.flatMap((ship) =>
    Array.from({ length: ship.count }, (_, instanceIndex) => ({
      definitionId: ship.id,
      instanceIndex,
      name: ship.name,
      size: ship.size,
    })),
  );
}

export function getShipCells(
  placement: PlacedShip,
  shipSize: number,
): Array<{ x: number; y: number }> {
  return Array.from({ length: shipSize }, (_, offset) => ({
    x: placement.x + (placement.orientation === 'horizontal' ? offset : 0),
    y: placement.y + (placement.orientation === 'vertical' ? offset : 0),
  }));
}

export function buildOccupiedMap(
  placements: PlacedShip[],
  shipsById: Map<string, ShipDefinition>,
): Map<string, OccupiedCell> {
  const occupied = new Map<string, OccupiedCell>();

  for (const placement of placements) {
    const ship = shipsById.get(placement.definitionId);
    if (!ship) continue;

    const cells = getShipCells(placement, ship.size);
    for (const cell of cells) {
      occupied.set(cellKey(cell.x, cell.y), {
        definitionId: placement.definitionId,
        instanceIndex: placement.instanceIndex,
      });
    }
  }

  return occupied;
}

export function canPlace(
  candidate: PlacedShip,
  shipSize: number,
  boardConfig: BoardConfig,
  occupied: Map<string, OccupiedCell>,
): boolean {
  const endX =
        candidate.x +
        (candidate.orientation === 'horizontal' ? shipSize - 1 : 0);
  const endY =
        candidate.y + (candidate.orientation === 'vertical' ? shipSize - 1 : 0);

  if (
    candidate.x < 0 ||
        candidate.y < 0 ||
        endX >= boardConfig.cols ||
        endY >= boardConfig.rows
  ) {
    return false;
  }

  const cells = getShipCells(candidate, shipSize);
  for (const cell of cells) {
    if (occupied.has(cellKey(cell.x, cell.y))) return false;
  }

  return true;
}

export function buildRandomPlacements(
  shipInstances: ShipInstance[],
  boardConfig: BoardConfig,
  shipsById: Map<string, ShipDefinition>,
  maxAttempts = 400,
): PlacedShip[] | null {
  const orderedInstances = [...shipInstances].sort((a, b) => b.size - a.size);
  const nextPlacements: PlacedShip[] = [];

  for (const instance of orderedInstances) {
    let placed = false;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const orientation: Orientation =
                Math.random() > 0.5 ? 'horizontal' : 'vertical';
      const x = Math.floor(Math.random() * boardConfig.cols);
      const y = Math.floor(Math.random() * boardConfig.rows);

      const candidate: PlacedShip = {
        definitionId: instance.definitionId,
        instanceIndex: instance.instanceIndex,
        x,
        y,
        orientation,
      };

      const occupied = buildOccupiedMap(nextPlacements, shipsById);
      if (canPlace(candidate, instance.size, boardConfig, occupied)) {
        nextPlacements.push(candidate);
        placed = true;
        break;
      }
    }

    if (!placed) return null;
  }

  return nextPlacements;
}
