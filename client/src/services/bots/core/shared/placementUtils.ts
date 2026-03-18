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

function buildInitialProbabilityHeatMap(
  boardConfig: BoardConfig,
  shipInstances: ShipInstance[],
): Map<string, number> {
  const heatMap = new Map<string, number>();

  for (const instance of shipInstances) {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const maxX = orientation === 'horizontal'
        ? boardConfig.cols - instance.size
        : boardConfig.cols - 1;
      const maxY = orientation === 'vertical'
        ? boardConfig.rows - instance.size
        : boardConfig.rows - 1;

      for (let y = 0; y <= maxY; y += 1) {
        for (let x = 0; x <= maxX; x += 1) {
          for (let offset = 0; offset < instance.size; offset += 1) {
            const cellX = x + (orientation === 'horizontal' ? offset : 0);
            const cellY = y + (orientation === 'vertical' ? offset : 0);
            const key = cellKey(cellX, cellY);
            heatMap.set(key, (heatMap.get(key) ?? 0) + 1);
          }
        }
      }
    }
  }

  return heatMap;
}

function scorePlacementLayout(
  placements: PlacedShip[],
  shipInstancesById: Map<string, ShipInstance>,
  boardConfig: BoardConfig,
  heatMap: ReadonlyMap<string, number>,
): number {
  const points: Array<{ x: number; y: number; definitionId: string; instanceIndex: number }> = [];
  let heatPenalty = 0;
  let edgeBonus = 0;

  for (const placement of placements) {
    const instanceId = instanceKey(placement.definitionId, placement.instanceIndex);
    const instance = shipInstancesById.get(instanceId);
    if (!instance) {
      continue;
    }

    const cells = getShipCells(placement, instance.size);
    for (const cell of cells) {
      points.push({
        x: cell.x,
        y: cell.y,
        definitionId: placement.definitionId,
        instanceIndex: placement.instanceIndex,
      });

      heatPenalty += heatMap.get(cellKey(cell.x, cell.y)) ?? 0;

      const toEdge = Math.min(
        cell.x,
        boardConfig.cols - 1 - cell.x,
        cell.y,
        boardConfig.rows - 1 - cell.y,
      );
      edgeBonus += Math.max(0, 2 - toEdge);
    }
  }

  let separationScore = 0;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const left = points[i];
      const right = points[j];

      if (
        left.definitionId === right.definitionId &&
        left.instanceIndex === right.instanceIndex
      ) {
        continue;
      }

      const distance = Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
      separationScore += Math.min(distance, 6);
    }
  }

  // Lower heat is better, more spread and edge skew is better.
  return separationScore * 3 + edgeBonus * 8 - heatPenalty * 2;
}

export function buildStrategicPlacements(
  shipInstances: ShipInstance[],
  boardConfig: BoardConfig,
  shipsById: Map<string, ShipDefinition>,
  attempts = 160,
): PlacedShip[] | null {
  const heatMap = buildInitialProbabilityHeatMap(boardConfig, shipInstances);
  const shipInstancesById = new Map(
    shipInstances.map((instance) => [
      instanceKey(instance.definitionId, instance.instanceIndex),
      instance,
    ]),
  );

  let bestPlacements: PlacedShip[] | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = buildRandomPlacements(
      shipInstances,
      boardConfig,
      shipsById,
      300,
    );
    if (!candidate) {
      continue;
    }

    const score = scorePlacementLayout(
      candidate,
      shipInstancesById,
      boardConfig,
      heatMap,
    );
    if (score > bestScore) {
      bestScore = score;
      bestPlacements = candidate;
    }
  }

  return bestPlacements;
}
