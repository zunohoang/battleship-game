import { HardBot } from '@/services/bots/hardBot';
import { buildProbabilityHeatMap } from '@/services/bots/core/scoring/probability';
import type { BotShot } from '@/services/bots/types';
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
import {
  cellKey,
  getShipCells,
  instanceKey,
} from '@/services/bots/core/shared/placementUtils';

interface ShipTrackingState {
  size: number;
  remainingCells: number;
  hitCells: Set<string>;
  isSunk: boolean;
}

export interface FleetShipStatus {
  key: string;
  label: string;
  size: number;
  isDestroyed: boolean;
}

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

export function calculateFleetShipStatuses(
  placements: PlacedShip[],
  shipsById: Map<string, ShipDefinition>,
  shots: Shot[],
): FleetShipStatus[] {
  const hitKeys = new Set(
    shots.filter((shot) => shot.isHit).map((shot) => cellKey(shot.x, shot.y)),
  );

  return placements
    .map((placement) => {
      const ship = shipsById.get(placement.definitionId);
      if (!ship) {
        return null;
      }

      const cells = getShipCells(placement, ship.size);
      const isDestroyed = cells.every((cell) =>
        hitKeys.has(cellKey(cell.x, cell.y)),
      );
      const suffix = ship.count > 1 ? ` ${placement.instanceIndex + 1}` : '';

      return {
        key: instanceKey(placement.definitionId, placement.instanceIndex),
        label: `${ship.name}${suffix}`,
        size: ship.size,
        isDestroyed,
      };
    })
    .filter((entry): entry is FleetShipStatus => entry !== null);
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

function buildShipTracking(
  targetPlacements: PlacedShip[],
  targetShipsById: Map<string, ShipDefinition>,
) {
  const cellToInstance = new Map<
    string,
    { instanceKey: string; size: number }
  >();
  const instanceState = new Map<string, ShipTrackingState>();

  for (const placement of targetPlacements) {
    const ship = targetShipsById.get(placement.definitionId);
    if (!ship) {
      continue;
    }

    const key = instanceKey(placement.definitionId, placement.instanceIndex);
    const cells = getShipCells(placement, ship.size);

    instanceState.set(key, {
      size: ship.size,
      remainingCells: cells.length,
      hitCells: new Set<string>(),
      isSunk: false,
    });

    for (const cell of cells) {
      cellToInstance.set(cellKey(cell.x, cell.y), {
        instanceKey: key,
        size: ship.size,
      });
    }
  }

  return { cellToInstance, instanceState };
}

function buildSinkAwareBotShots(
  shots: Shot[],
  targetPlacements: PlacedShip[],
  targetShipsById: Map<string, ShipDefinition>,
): { botShots: BotShot[]; remainingShipSizes: number[] } {
  const { cellToInstance, instanceState } = buildShipTracking(
    targetPlacements,
    targetShipsById,
  );

  const botShots: BotShot[] = [];

  for (const shot of shots) {
    const key = cellKey(shot.x, shot.y);
    const shotEntry: BotShot = {
      x: shot.x,
      y: shot.y,
      isHit: shot.isHit,
    };

    if (shot.isHit) {
      const mapped = cellToInstance.get(key);
      if (mapped) {
        shotEntry.shipInstanceKey = mapped.instanceKey;
        const state = instanceState.get(mapped.instanceKey);
        if (state && !state.hitCells.has(key)) {
          state.hitCells.add(key);
          state.remainingCells = Math.max(0, state.remainingCells - 1);
          if (state.remainingCells === 0 && !state.isSunk) {
            state.isSunk = true;
            shotEntry.didSink = true;
            shotEntry.sunkShipSize = state.size;
          }
        }
      }
    }

    botShots.push(shotEntry);
  }

  const remainingShipSizes: number[] = [];
  for (const state of instanceState.values()) {
    if (!state.isSunk) {
      remainingShipSizes.push(state.size);
    }
  }

  return { botShots, remainingShipSizes };
}

const hardBot = new HardBot();

export function buildBotHeatMap(
  boardConfig: BoardConfig,
  ships: ShipDefinition[],
  shots: Shot[],
  difficulty: AiDifficulty,
  targetPlacements?: PlacedShip[],
  targetShipsById?: Map<string, ShipDefinition>,
): Map<string, number> {
  if (difficulty !== 'probability') {
    return new Map();
  }

  const attemptedShots = new Set(shots.map((shot) => cellKey(shot.x, shot.y)));
  let botShots: BotShot[] = shots.map((shot) => ({
    x: shot.x,
    y: shot.y,
    isHit: shot.isHit,
  }));
  let remainingShipSizes: number[] | undefined;

  if (targetPlacements && targetShipsById) {
    const analyzed = buildSinkAwareBotShots(shots, targetPlacements, targetShipsById);
    botShots = analyzed.botShots;
    remainingShipSizes = analyzed.remainingShipSizes;
  }

  const { rows, cols } = boardConfig;
  const shipSizes = remainingShipSizes?.length
    ? remainingShipSizes
    : ships.map((s) => s.size);

  const availableKeys = new Set<string>();
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const key = cellKey(x, y);
      if (!attemptedShots.has(key)) {
        availableKeys.add(key);
      }
    }
  }

  const missKeys = new Set(
    botShots.filter((s) => !s.isHit).map((s) => cellKey(s.x, s.y)),
  );

  return buildProbabilityHeatMap({ rows, cols, shipSizes, availableKeys, missKeys });
}

export function getBotShot(
  boardConfig: BoardConfig,
  ships: ShipDefinition[],
  shots: Shot[],
  difficulty: AiDifficulty,
  targetPlacements?: PlacedShip[],
  targetShipsById?: Map<string, ShipDefinition>,
): { x: number; y: number } | null {
  if (difficulty === 'learning') {
    return botFireLearning(boardConfig, shots);
  }

  if (difficulty === 'probability') {
    const attemptedShots = new Set(
      shots.map((shot) => cellKey(shot.x, shot.y)),
    );
    let botShots: BotShot[] = shots.map((shot) => ({
      x: shot.x,
      y: shot.y,
      isHit: shot.isHit,
    }));
    let remainingShipSizes: number[] | undefined;

    if (targetPlacements && targetShipsById) {
      const analyzed = buildSinkAwareBotShots(
        shots,
        targetPlacements,
        targetShipsById,
      );
      botShots = analyzed.botShots;
      remainingShipSizes = analyzed.remainingShipSizes;
    }

    return hardBot.pickTarget({
      boardConfig,
      attemptedShots,
      shots: botShots,
      shipSizes: ships.map((ship) => ship.size),
      remainingShipSizes,
      lastShot: botShots[botShots.length - 1],
    });
  }

  return botFireRandom(boardConfig, shots);
}
