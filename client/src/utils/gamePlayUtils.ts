import { HardBot } from '@/services/bots/hardBot';
import { buildAvailableTargets } from '@/services/bots/core/candidates/availableTargets';
import { scoreCandidates } from '@/services/bots/core/policy/selectTarget';
import { buildProbabilityHeatMap } from '@/services/bots/core/scoring/probability';
import { toCellKey } from '@/services/bots/core/shared/boardUtils';
import {
  buildHitClusters,
  buildShotSets,
  openTargetsAroundCluster,
} from '@/services/bots/core/state-tracker/shotAnalysis';
import type { BotShot, BotTurnContext } from '@/services/bots/types';
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

export interface HeatMapExplanationEntry {
  coordLabel: string;
  x: number;
  y: number;
  total: number;
  base: number;
  parityBonus: number;
  centerBonus: number;
  adjacencyBonus: number;
  attempted: boolean;
  isFocusCandidate: boolean;
  mode: 'hunt' | 'target' | 'cluster';
  basePlacementLabels: string[];
  adjacencySourceLabels: string[];
  clusterSourceLabels: string[];
}

let logId = 0;
const DEFAULT_SHIP_SIZES = [5, 4, 3, 3, 2] as const;

function centerBonus(x: number, y: number, cols: number, rows: number): number {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const dist = Math.abs(x - cx) + Math.abs(y - cy);
  return Math.round(rows + cols - dist);
}

function buildPlacementCoordLabels(
  x: number,
  y: number,
  size: number,
  orientation: 'horizontal' | 'vertical',
): string[] {
  const labels: string[] = [];

  for (let i = 0; i < size; i += 1) {
    const px = x + (orientation === 'horizontal' ? i : 0);
    const py = y + (orientation === 'vertical' ? i : 0);
    labels.push(toCoordLabel(px, py));
  }

  return labels;
}

function includesAllRequiredHits(
  placementKeys: readonly string[],
  requiredHitKeys: ReadonlySet<string>,
): boolean {
  for (const hitKey of requiredHitKeys) {
    if (!placementKeys.includes(hitKey)) {
      return false;
    }
  }

  return true;
}

function buildPlacementContributionMap({
  rows,
  cols,
  shipSizes,
  availableKeys,
  missKeys,
  requiredHitKeys,
}: {
  rows: number;
  cols: number;
  shipSizes: readonly number[];
  availableKeys: ReadonlySet<string>;
  missKeys: ReadonlySet<string>;
  requiredHitKeys?: ReadonlySet<string>;
}): Map<string, string[]> {
  const contributionMap = new Map<string, string[]>();

  for (const size of shipSizes) {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const maxX = orientation === 'horizontal' ? cols - size : cols - 1;
      const maxY = orientation === 'vertical' ? rows - size : rows - 1;

      for (let y = 0; y <= maxY; y += 1) {
        for (let x = 0; x <= maxX; x += 1) {
          const placementKeys: string[] = [];

          for (let i = 0; i < size; i += 1) {
            const px = x + (orientation === 'horizontal' ? i : 0);
            const py = y + (orientation === 'vertical' ? i : 0);
            placementKeys.push(toCellKey(px, py));
          }

          if (placementKeys.some((key) => missKeys.has(key))) {
            continue;
          }

          if (
            requiredHitKeys &&
            requiredHitKeys.size > 0 &&
            !includesAllRequiredHits(placementKeys, requiredHitKeys)
          ) {
            continue;
          }

          const placementLabel = buildPlacementCoordLabels(x, y, size, orientation).join(' -> ');

          for (const key of placementKeys) {
            if (!availableKeys.has(key)) {
              continue;
            }

            const existing = contributionMap.get(key);
            if (existing) {
              existing.push(placementLabel);
            } else {
              contributionMap.set(key, [placementLabel]);
            }
          }
        }
      }
    }
  }

  return contributionMap;
}

function buildProbabilityDebugScoreMap(context: BotTurnContext): Map<string, number> {
  const { rows, cols } = context.boardConfig;
  const candidates = buildAvailableTargets(context);

  if (candidates.length === 0) {
    return new Map<string, number>();
  }

  const shots = context.shots ?? [];
  const sunkShipInstanceKeys = new Set(
    shots
      .filter((shot) => shot.didSink && shot.shipInstanceKey)
      .map((shot) => shot.shipInstanceKey as string),
  );
  const unresolvedShots = shots.filter(
    (shot) =>
      !(shot.shipInstanceKey && sunkShipInstanceKeys.has(shot.shipInstanceKey)),
  );
  const shipSizes = context.remainingShipSizes?.length
    ? context.remainingShipSizes
    : context.shipSizes?.length
      ? context.shipSizes
      : DEFAULT_SHIP_SIZES;

  const availableKeys = new Set(
    candidates.map((cell) => toCellKey(cell.x, cell.y)),
  );

  const { hitKeys, missKeys } = buildShotSets(unresolvedShots);
  const maxShipSize =
    shipSizes.length > 0 ? Math.max(...shipSizes) : Number.POSITIVE_INFINITY;
  const clusters = buildHitClusters(unresolvedShots, rows, cols).filter(
    (cluster) => cluster.cells.length <= maxShipSize,
  );

  if (clusters.length > 0) {
    const focus = [...clusters].sort((a, b) => b.cells.length - a.cells.length)[0];
    const focusCandidates = openTargetsAroundCluster(
      focus,
      context.attemptedShots,
      rows,
      cols,
    );

    if (focusCandidates.length > 0) {
      const requiredHitKeys = new Set(
        focus.cells.map((cell) => toCellKey(cell.x, cell.y)),
      );
      const focusCandidateKeys = new Set(
        focusCandidates.map((cell) => toCellKey(cell.x, cell.y)),
      );

      const targetHeat = buildProbabilityHeatMap({
        rows,
        cols,
        shipSizes,
        availableKeys,
        missKeys,
        requiredHitKeys,
      });

      return scoreCandidates(candidates, targetHeat, (cell) => {
        if (!focusCandidateKeys.has(toCellKey(cell.x, cell.y))) {
          return 0;
        }

        const keyLeft = toCellKey(cell.x - 1, cell.y);
        const keyRight = toCellKey(cell.x + 1, cell.y);
        const keyUp = toCellKey(cell.x, cell.y - 1);
        const keyDown = toCellKey(cell.x, cell.y + 1);

        let adjacency = 0;
        if (hitKeys.has(keyLeft)) adjacency += 1;
        if (hitKeys.has(keyRight)) adjacency += 1;
        if (hitKeys.has(keyUp)) adjacency += 1;
        if (hitKeys.has(keyDown)) adjacency += 1;

        return adjacency * 6;
      });
    }

    const clusterCandidates = clusters.flatMap((cluster) =>
      openTargetsAroundCluster(cluster, context.attemptedShots, rows, cols),
    );
    const tieScores = new Map<string, number>();

    for (const cell of candidates) {
      tieScores.set(toCellKey(cell.x, cell.y), 0);
    }

    for (const cell of clusterCandidates) {
      tieScores.set(toCellKey(cell.x, cell.y), 1);
    }

    return tieScores;
  }

  const huntHeat = buildProbabilityHeatMap({
    rows,
    cols,
    shipSizes,
    availableKeys,
    missKeys,
  });

  return scoreCandidates(candidates, huntHeat, (cell) => {
    const parity = (cell.x + cell.y) % 2 === 0 ? 2 : 0;
    const center = centerBonus(cell.x, cell.y, cols, rows);
    return parity + center;
  });
}

export function buildBotHeatMapExplanation(
  boardConfig: BoardConfig,
  ships: ShipDefinition[],
  shots: Shot[],
  difficulty: AiDifficulty,
  targetPlacements?: PlacedShip[],
  targetShipsById?: Map<string, ShipDefinition>,
): HeatMapExplanationEntry[] {
  const entries: HeatMapExplanationEntry[] = [];

  for (let x = 0; x < boardConfig.cols; x += 1) {
    for (let y = 0; y < boardConfig.rows; y += 1) {
      entries.push({
        coordLabel: toCoordLabel(x, y),
        x,
        y,
        total: 0,
        base: 0,
        parityBonus: 0,
        centerBonus: 0,
        adjacencyBonus: 0,
        attempted: false,
        isFocusCandidate: false,
        mode: 'hunt',
        basePlacementLabels: [],
        adjacencySourceLabels: [],
        clusterSourceLabels: [],
      });
    }
  }

  if (difficulty !== 'probability') {
    return entries;
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

  const context: BotTurnContext = {
    boardConfig,
    attemptedShots,
    shots: botShots,
    shipSizes: ships.map((ship) => ship.size),
    remainingShipSizes,
    lastShot: botShots[botShots.length - 1],
  };
  const candidates = buildAvailableTargets(context);
  const candidateKeySet = new Set(candidates.map((cell) => toCellKey(cell.x, cell.y)));
  const shotsList = context.shots ?? [];
  const sunkShipInstanceKeys = new Set(
    shotsList
      .filter((shot) => shot.didSink && shot.shipInstanceKey)
      .map((shot) => shot.shipInstanceKey as string),
  );
  const unresolvedShots = shotsList.filter(
    (shot) =>
      !(shot.shipInstanceKey && sunkShipInstanceKeys.has(shot.shipInstanceKey)),
  );
  const shipSizes = context.remainingShipSizes?.length
    ? context.remainingShipSizes
    : context.shipSizes?.length
      ? context.shipSizes
      : DEFAULT_SHIP_SIZES;
  const availableKeys = new Set(candidates.map((cell) => toCellKey(cell.x, cell.y)));
  const { hitKeys, missKeys } = buildShotSets(unresolvedShots);
  const maxShipSize =
    shipSizes.length > 0 ? Math.max(...shipSizes) : Number.POSITIVE_INFINITY;
  const clusters = buildHitClusters(unresolvedShots, boardConfig.rows, boardConfig.cols).filter(
    (cluster) => cluster.cells.length <= maxShipSize,
  );

  if (clusters.length > 0) {
    const focus = [...clusters].sort((a, b) => b.cells.length - a.cells.length)[0];
    const focusCandidates = openTargetsAroundCluster(
      focus,
      context.attemptedShots,
      boardConfig.rows,
      boardConfig.cols,
    );

    if (focusCandidates.length > 0) {
      const requiredHitKeys = new Set(
        focus.cells.map((cell) => toCellKey(cell.x, cell.y)),
      );
      const focusCandidateKeys = new Set(
        focusCandidates.map((cell) => toCellKey(cell.x, cell.y)),
      );
      const targetHeat = buildProbabilityHeatMap({
        rows: boardConfig.rows,
        cols: boardConfig.cols,
        shipSizes,
        availableKeys,
        missKeys,
        requiredHitKeys,
      });
      const placementContributionMap = buildPlacementContributionMap({
        rows: boardConfig.rows,
        cols: boardConfig.cols,
        shipSizes,
        availableKeys,
        missKeys,
        requiredHitKeys,
      });

      return entries.map((entry) => {
        const key = toCellKey(entry.x, entry.y);
        const attempted = attemptedShots.has(key);
        const base = targetHeat.get(key) ?? 0;
        let adjacencyBonus = 0;
        const adjacencySourceLabels: string[] = [];

        if (!attempted && focusCandidateKeys.has(key)) {
          const keyLeft = toCellKey(entry.x - 1, entry.y);
          const keyRight = toCellKey(entry.x + 1, entry.y);
          const keyUp = toCellKey(entry.x, entry.y - 1);
          const keyDown = toCellKey(entry.x, entry.y + 1);

          if (hitKeys.has(keyLeft)) {
            adjacencyBonus += 6;
            adjacencySourceLabels.push(toCoordLabel(entry.x - 1, entry.y));
          }
          if (hitKeys.has(keyRight)) {
            adjacencyBonus += 6;
            adjacencySourceLabels.push(toCoordLabel(entry.x + 1, entry.y));
          }
          if (hitKeys.has(keyUp)) {
            adjacencyBonus += 6;
            adjacencySourceLabels.push(toCoordLabel(entry.x, entry.y - 1));
          }
          if (hitKeys.has(keyDown)) {
            adjacencyBonus += 6;
            adjacencySourceLabels.push(toCoordLabel(entry.x, entry.y + 1));
          }
        }

        return {
          ...entry,
          attempted,
          base,
          adjacencyBonus,
          isFocusCandidate: !attempted && focusCandidateKeys.has(key),
          total: attempted ? 0 : base + adjacencyBonus,
          mode: 'target',
          basePlacementLabels: placementContributionMap.get(key) ?? [],
          adjacencySourceLabels,
        };
      });
    }

    const clusterCandidateKeys = new Set(
      clusters
        .flatMap((cluster) =>
          openTargetsAroundCluster(
            cluster,
            context.attemptedShots,
            boardConfig.rows,
            boardConfig.cols,
          ),
        )
        .map((cell) => toCellKey(cell.x, cell.y)),
    );

    return entries.map((entry) => {
      const key = toCellKey(entry.x, entry.y);
      const attempted = attemptedShots.has(key);
      const total = attempted ? 0 : clusterCandidateKeys.has(key) ? 1 : 0;
      const clusterSourceLabels = clusters
        .filter((cluster) =>
          openTargetsAroundCluster(
            cluster,
            context.attemptedShots,
            boardConfig.rows,
            boardConfig.cols,
          ).some((cell) => cell.x === entry.x && cell.y === entry.y),
        )
        .map((cluster) => cluster.cells.map((cell) => toCoordLabel(cell.x, cell.y)).join(', '));

      return {
        ...entry,
        attempted,
        total,
        isFocusCandidate: !attempted && clusterCandidateKeys.has(key),
        mode: 'cluster',
        clusterSourceLabels,
      };
    });
  }

  const huntHeat = buildProbabilityHeatMap({
    rows: boardConfig.rows,
    cols: boardConfig.cols,
    shipSizes,
    availableKeys,
    missKeys,
  });
  const placementContributionMap = buildPlacementContributionMap({
    rows: boardConfig.rows,
    cols: boardConfig.cols,
    shipSizes,
    availableKeys,
    missKeys,
  });

  return entries.map((entry) => {
    const key = toCellKey(entry.x, entry.y);
    const attempted = attemptedShots.has(key);
    const base = huntHeat.get(key) ?? 0;
    const parityBonus = (entry.x + entry.y) % 2 === 0 && candidateKeySet.has(key) ? 2 : 0;
    const center = candidateKeySet.has(key)
      ? centerBonus(entry.x, entry.y, boardConfig.cols, boardConfig.rows)
      : 0;

    return {
      ...entry,
      attempted,
      base,
      parityBonus,
      centerBonus: center,
      total: attempted ? 0 : base + parityBonus + center,
      mode: 'hunt',
      basePlacementLabels: placementContributionMap.get(key) ?? [],
    };
  });
}

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

  return buildProbabilityDebugScoreMap({
    boardConfig,
    attemptedShots,
    shots: botShots,
    shipSizes: ships.map((ship) => ship.size),
    remainingShipSizes,
    lastShot: botShots[botShots.length - 1],
  });
}

export function getBotShot(
  boardConfig: BoardConfig,
  ships: ShipDefinition[],
  shots: Shot[],
  difficulty: AiDifficulty,
  targetPlacements?: PlacedShip[],
  targetShipsById?: Map<string, ShipDefinition>,
): { x: number; y: number } | null {
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
