import type {
  AiDifficulty,
  BoardConfig,
  MissionLogEntry,
  MissionLogHighlight,
  PlacedShip,
  ShipDefinition,
  ShotRecord,
  Shot,
} from '@/types/game';
import { cellKey, getShipCells } from '@/utils/placementUtils';

let logId = 0;

export function makeLog(
  message: string,
  highlight?: MissionLogHighlight,
): MissionLogEntry {
  const now = new Date();
  const timestamp = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');

  return {
    id: logId++,
    timestamp,
    message,
    highlight,
  };
}

export function toCoordLabel(x: number, y: number): string {
  let value = x;
  let label = '';

  do {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return `${label}-${y + 1}`;
}

export function checkAllSunk(
  placements: PlacedShip[],
  shipsById: Map<string, ShipDefinition>,
  shots: Shot[],
): boolean {
  const hitKeys = new Set(
    shots.filter((shot) => shot.isHit).map((shot) => cellKey(shot.x, shot.y)),
  );

  for (const placement of placements) {
    const ship = shipsById.get(placement.definitionId);
    if (!ship) {
      continue;
    }

    for (const cell of getShipCells(placement, ship.size)) {
      if (!hitKeys.has(cellKey(cell.x, cell.y))) {
        return false;
      }
    }
  }

  return true;
}

export function formatLogTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--:--';
  }

  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((entry) => String(entry).padStart(2, '0'))
    .join(':');
}

export function toBattleShots(shots: ShotRecord[]): Shot[] {
  return shots.map((shot) => ({
    x: shot.x,
    y: shot.y,
    isHit: shot.isHit,
  }));
}

export function calculateShotStats(shots: Shot[]) {
  const hits = shots.filter((shot) => shot.isHit).length;
  const misses = shots.length - hits;
  const accuracy = shots.length ? Math.round((hits / shots.length) * 100) : 0;

  return {
    total: shots.length,
    hits,
    misses,
    accuracy,
  };
}

export function botFireRandom(
  boardConfig: BoardConfig,
  shots: Shot[],
): { x: number; y: number } | null {
  const shotSet = new Set(shots.map((shot) => cellKey(shot.x, shot.y)));
  const candidates: { x: number; y: number }[] = [];

  for (let y = 0; y < boardConfig.rows; y += 1) {
    for (let x = 0; x < boardConfig.cols; x += 1) {
      if (!shotSet.has(cellKey(x, y))) {
        candidates.push({ x, y });
      }
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function botFireLearning(
  boardConfig: BoardConfig,
  shots: Shot[],
): { x: number; y: number } | null {
  const shotSet = new Set(shots.map((shot) => cellKey(shot.x, shot.y)));
  const hits = shots.filter((shot) => shot.isHit);
  const adjacentTargets: { x: number; y: number }[] = [];

  for (const hit of hits) {
    for (const target of [
      { x: hit.x - 1, y: hit.y },
      { x: hit.x + 1, y: hit.y },
      { x: hit.x, y: hit.y - 1 },
      { x: hit.x, y: hit.y + 1 },
    ]) {
      if (
        target.x >= 0 &&
        target.x < boardConfig.cols &&
        target.y >= 0 &&
        target.y < boardConfig.rows &&
        !shotSet.has(cellKey(target.x, target.y))
      ) {
        adjacentTargets.push(target);
      }
    }
  }

  if (adjacentTargets.length > 0) {
    return adjacentTargets[Math.floor(Math.random() * adjacentTargets.length)];
  }

  return botFireRandom(boardConfig, shots);
}

export function botFireProbability(
  boardConfig: BoardConfig,
  ships: ShipDefinition[],
  shots: Shot[],
): { x: number; y: number } | null {
  const shotSet = new Set(shots.map((shot) => cellKey(shot.x, shot.y)));
  const hitSet = new Set(
    shots.filter((shot) => shot.isHit).map((shot) => cellKey(shot.x, shot.y)),
  );
  const missSet = new Set(
    shots.filter((shot) => !shot.isHit).map((shot) => cellKey(shot.x, shot.y)),
  );
  const density = new Map<string, number>();

  for (const ship of ships) {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const maxCol =
        orientation === 'horizontal'
          ? boardConfig.cols - ship.size
          : boardConfig.cols - 1;
      const maxRow =
        orientation === 'vertical'
          ? boardConfig.rows - ship.size
          : boardConfig.rows - 1;

      for (let y = 0; y <= maxRow; y += 1) {
        for (let x = 0; x <= maxCol; x += 1) {
          let valid = true;
          let hasHit = false;

          for (let index = 0; index < ship.size; index += 1) {
            const cellX = x + (orientation === 'horizontal' ? index : 0);
            const cellY = y + (orientation === 'vertical' ? index : 0);
            const key = cellKey(cellX, cellY);

            if (missSet.has(key)) {
              valid = false;
              break;
            }

            if (hitSet.has(key)) {
              hasHit = true;
            }
          }

          if (!valid) {
            continue;
          }

          const weight = hasHit ? 3 : 1;
          for (let index = 0; index < ship.size; index += 1) {
            const cellX = x + (orientation === 'horizontal' ? index : 0);
            const cellY = y + (orientation === 'vertical' ? index : 0);
            const key = cellKey(cellX, cellY);

            if (!shotSet.has(key)) {
              density.set(key, (density.get(key) ?? 0) + weight);
            }
          }
        }
      }
    }
  }

  if (density.size === 0) {
    return botFireRandom(boardConfig, shots);
  }

  let bestTarget: { x: number; y: number } | null = null;
  let bestScore = 0;

  for (const [key, score] of density.entries()) {
    if (score <= bestScore) {
      continue;
    }

    bestScore = score;
    const [x, y] = key.split(',');
    bestTarget = {
      x: parseInt(x, 10),
      y: parseInt(y, 10),
    };
  }

  return bestTarget ?? botFireRandom(boardConfig, shots);
}

export function getBotShot(
  boardConfig: BoardConfig,
  ships: ShipDefinition[],
  shots: Shot[],
  difficulty: AiDifficulty,
): { x: number; y: number } | null {
  if (difficulty === 'learning') {
    return botFireLearning(boardConfig, shots);
  }

  if (difficulty === 'probability') {
    return botFireProbability(boardConfig, ships, shots);
  }

  return botFireRandom(boardConfig, shots);
}

