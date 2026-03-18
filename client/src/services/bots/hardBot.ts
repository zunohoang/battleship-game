import type { BotTarget, BotTurnContext, GameBot } from '@/services/bots/types';
import {
  buildAvailableTargets,
  filterParityCells,
} from '@/services/bots/core/candidates/availableTargets';
import {
  pickBestTarget,
  scoreCandidates,
} from '@/services/bots/core/policy/selectTarget';
import { buildProbabilityHeatMap } from '@/services/bots/core/scoring/probability';
import { toCellKey } from '@/services/bots/core/shared/boardUtils';
import {
  buildHitClusters,
  buildShotSets,
  openTargetsAroundCluster,
} from '@/services/bots/core/state-tracker/shotAnalysis';

const DEFAULT_SHIP_SIZES = [5, 4, 3, 3, 2] as const;

function centerBonus(x: number, y: number, cols: number, rows: number): number {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const dist = Math.abs(x - cx) + Math.abs(y - cy);
  return Math.round(rows + cols - dist);
}

export class HardBot implements GameBot {
  readonly name = 'HardBot';

  pickTarget(context: BotTurnContext): BotTarget | null {
    const { rows, cols } = context.boardConfig;
    const candidates = buildAvailableTargets(context);

    if (candidates.length === 0) {
      return null;
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

    // TARGET MODE: if we have active hit clusters, try to finish them first.
    if (clusters.length > 0) {
      const focus = [...clusters].sort((a, b) => b.cells.length - a.cells.length)[0];
      const focusCandidates = openTargetsAroundCluster(
        focus,
        context.attemptedShots,
        rows,
        cols,
      );

      if (focusCandidates.length > 0) {
        // Focus strongest cluster first (largest damage chain).
        const requiredHitKeys = new Set(
          focus.cells.map((cell) => toCellKey(cell.x, cell.y)),
        );

        const targetHeat = buildProbabilityHeatMap({
          rows,
          cols,
          shipSizes,
          availableKeys,
          missKeys,
          requiredHitKeys,
        });

        const scoreMap = scoreCandidates(
          focusCandidates,
          targetHeat,
          (cell) => {
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
          },
        );

        return pickBestTarget(scoreMap, focusCandidates);
      }

      const clusterCandidates = clusters.flatMap((cluster) =>
        openTargetsAroundCluster(cluster, context.attemptedShots, rows, cols),
      );
      if (clusterCandidates.length > 0) {
        return pickBestTarget(new Map(), clusterCandidates);
      }
    }

    // HUNT MODE: parity + probability + center preference.
    const parityCandidates = filterParityCells(candidates, 0);
    const huntPool =
      parityCandidates.length > 0 ? parityCandidates : candidates;

    const huntHeat = buildProbabilityHeatMap({
      rows,
      cols,
      shipSizes,
      availableKeys,
      missKeys,
    });

    const huntScores = scoreCandidates(huntPool, huntHeat, (cell) => {
      const parity = (cell.x + cell.y) % 2 === 0 ? 2 : 0;
      const center = centerBonus(cell.x, cell.y, cols, rows);
      return parity + center;
    });

    return pickBestTarget(huntScores, huntPool);
  }
}
